import { NextResponse } from "next/server";
import { z } from "zod";
import { getModuleDraft, upsertModuleDraft } from "@/lib/operationsRepository";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

const draftQuerySchema = z.object({
  programId: z.string().trim().min(1),
  participantId: z.string().trim().min(1),
  moduleSlug: z.string().trim().min(1)
});

const draftUpsertSchema = draftQuerySchema.extend({
  draftData: z.record(z.string(), z.unknown()),
  currentStep: z.number().int().min(0).optional()
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = draftQuerySchema.parse({
      programId: url.searchParams.get("programId") || "",
      participantId: url.searchParams.get("participantId") || "",
      moduleSlug: url.searchParams.get("moduleSlug") || ""
    });
    const draft = await getModuleDraft(query);

    return NextResponse.json({
      draft: draft
        ? {
            id: draft.id,
            programId: draft.program_id,
            participantId: draft.participant_id,
            moduleSlug: draft.module_slug,
            draftData: draft.draft_data,
            currentStep: draft.current_step,
            savedAt: draft.saved_at
          }
        : null
    });
  } catch (error) {
    return handleOperationsApiError(error, "모듈 draft 조회 실패");
  }
}

export async function PUT(request: Request) {
  try {
    const body = draftUpsertSchema.parse(await request.json());
    const draft = await upsertModuleDraft(body);

    return NextResponse.json({
      draft: {
        id: draft.id,
        programId: draft.program_id,
        participantId: draft.participant_id,
        moduleSlug: draft.module_slug,
        draftData: draft.draft_data,
        currentStep: draft.current_step,
        savedAt: draft.saved_at
      }
    });
  } catch (error) {
    return handleOperationsApiError(error, "모듈 draft 저장 실패");
  }
}
