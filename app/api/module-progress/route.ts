import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getParticipant,
  syncModuleSubmissionFromProgress,
  upsertModuleProgress,
  type ParticipantModuleProgressRow
} from "@/lib/operationsRepository";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { authorizeActiveParticipantRequest, authorizeParticipantRequest } from "@/lib/participantAuth";
import { getStartupModuleBySlug } from "@/lib/startupModules";

const jsonObjectSchema = z.record(z.string(), z.unknown());

const moduleProgressSchema = z.object({
  programId: z.string().trim().min(1),
  participantId: z.string().trim().min(1),
  moduleSlug: z.string().trim().min(1),
  status: z.enum(["not_started", "in_progress", "completed", "needs_review", "returned"]),
  currentStep: z.number().int().min(0).optional(),
  inputData: jsonObjectSchema.optional(),
  outputData: jsonObjectSchema.optional(),
  adminComment: z.string().optional(),
  reviewedAt: z.string().nullable().optional()
});

function toModuleProgressDto(row: ParticipantModuleProgressRow) {
  return {
    id: row.id,
    programId: row.program_id,
    participantId: row.participant_id,
    moduleSlug: row.module_slug,
    status: row.status,
    currentStep: row.current_step,
    inputData: row.input_data,
    outputData: row.output_data,
    adminComment: row.admin_comment,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at
  };
}

export async function PATCH(request: Request) {
  try {
    const initialAuthorization = authorizeParticipantRequest(request, {}, { allowAdmin: true });
    if (!initialAuthorization.ok) return initialAuthorization.response;
    const body = moduleProgressSchema.parse(await request.json());
    const authorization = await authorizeActiveParticipantRequest(request, body, { allowAdmin: true });
    if (!authorization.ok) return authorization.response;
    const progress = await upsertModuleProgress({
      programId: body.programId,
      participantId: body.participantId,
      moduleSlug: body.moduleSlug,
      status: body.status,
      currentStep: body.currentStep,
      inputData: body.inputData,
      outputData: body.outputData,
      adminComment: body.adminComment,
      reviewedAt: body.reviewedAt
    });
    const startupModule = getStartupModuleBySlug(body.moduleSlug);
    const shouldSyncSubmission = body.moduleSlug !== "lean-canvas" && body.moduleSlug !== "modu-startup-application";
    const participant = shouldSyncSubmission ? await getParticipant(body.participantId) : null;
    const submission = shouldSyncSubmission
      ? await syncModuleSubmissionFromProgress({
          progress,
          title: startupModule?.title || body.moduleSlug,
          teamId: participant?.team_id
        })
      : null;

    return NextResponse.json({
      progress: toModuleProgressDto(progress),
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            moduleSlug: submission.module_slug,
            updatedAt: submission.updated_at
          }
        : undefined
    });
  } catch (error) {
    return handleOperationsApiError(error, "모듈 진행 상태 저장 실패");
  }
}
