import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createFeedback, type FeedbackRow } from "@/lib/operationsRepository";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

const feedbackCreateSchema = z.object({
  feedbackId: z.string().uuid().optional(),
  programId: z.string().trim().min(1),
  participantId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1).nullable().optional(),
  moduleSlug: z.string().trim().min(1).nullable().optional(),
  status: z.enum(["needs_revision", "good", "excellent", "published", "archived"]),
  comment: z.string().optional(),
  nextAction: z.string().optional()
});

function toFeedbackDto(row: FeedbackRow) {
  return {
    id: row.id,
    programId: row.program_id,
    participantId: row.participant_id,
    submissionId: row.submission_id,
    moduleSlug: row.module_slug,
    status: row.status,
    comment: row.comment,
    nextAction: row.next_action,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const body = feedbackCreateSchema.parse(await request.json());
    const feedback = await createFeedback({
      feedbackId: body.feedbackId,
      programId: body.programId,
      participantId: body.participantId,
      submissionId: body.submissionId,
      moduleSlug: body.moduleSlug,
      status: body.status,
      comment: body.comment,
      nextAction: body.nextAction
    });

    return NextResponse.json({ feedback: toFeedbackDto(feedback) }, { status: 201 });
  } catch (error) {
    return handleOperationsApiError(error, "피드백 저장 실패");
  }
}
