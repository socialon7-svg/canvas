import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import {
  createModuleSubmission,
  listModuleSubmissions,
  type ModuleSubmissionRow
} from "@/lib/operationsRepository";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { authorizeActiveParticipantRequest, authorizeParticipantRequest } from "@/lib/participantAuth";

const jsonObjectSchema = z.record(z.string(), z.unknown());

const moduleSubmissionCreateSchema = z.object({
  programId: z.string().trim().min(1),
  participantId: z.string().trim().min(1),
  teamId: z.string().trim().min(1).nullable().optional(),
  moduleSlug: z.string().trim().min(1),
  title: z.string().trim().optional(),
  status: z.enum(["draft", "submitted", "reviewed", "returned"]).optional(),
  pdfStatus: z.enum(["idle", "generating", "success", "failed"]).optional(),
  inputData: jsonObjectSchema.optional(),
  outputData: jsonObjectSchema.optional()
});

const moduleSubmissionQuerySchema = z.object({
  programId: z.string().trim().optional(),
  moduleSlug: z.string().trim().optional(),
  status: z.string().trim().optional()
});

function toModuleSubmissionDto(row: ModuleSubmissionRow) {
  return {
    id: row.id,
    programId: row.program_id,
    participantId: row.participant_id,
    teamId: row.team_id,
    moduleSlug: row.module_slug,
    title: row.title,
    status: row.status,
    pdfStatus: row.pdf_status,
    pdfErrorMessage: row.pdf_error_message,
    pdfGeneratedAt: row.pdf_generated_at,
    inputData: row.input_data,
    outputData: row.output_data,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const query = moduleSubmissionQuerySchema.parse({
      programId: url.searchParams.get("programId") || undefined,
      moduleSlug: url.searchParams.get("moduleSlug") || undefined,
      status: url.searchParams.get("status") || undefined
    });
    const submissions = await listModuleSubmissions(query);

    return NextResponse.json({ submissions: submissions.map(toModuleSubmissionDto) });
  } catch (error) {
    return handleOperationsApiError(error, "모듈 제출 목록 조회 실패");
  }
}

export async function POST(request: Request) {
  try {
    const initialAuthorization = authorizeParticipantRequest(request, {}, { allowAdmin: true });
    if (!initialAuthorization.ok) return initialAuthorization.response;
    const body = moduleSubmissionCreateSchema.parse(await request.json());
    const authorization = await authorizeActiveParticipantRequest(request, body, { allowAdmin: true });
    if (!authorization.ok) return authorization.response;
    const submission = await createModuleSubmission({
      programId: body.programId,
      participantId: body.participantId,
      teamId: body.teamId,
      moduleSlug: body.moduleSlug,
      title: body.title,
      status: body.status,
      pdfStatus: body.pdfStatus,
      inputData: body.inputData,
      outputData: body.outputData
    });

    return NextResponse.json({ submission: toModuleSubmissionDto(submission) }, { status: 201 });
  } catch (error) {
    return handleOperationsApiError(error, "모듈 제출 저장 실패");
  }
}
