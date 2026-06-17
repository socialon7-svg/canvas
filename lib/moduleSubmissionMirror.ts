import {
  createModuleSubmission,
  deleteModuleSubmissionsBySource,
  updateModuleSubmissionPdfStatusBySource,
  upsertModuleProgress,
  type ModuleSubmissionRow
} from "@/lib/operationsRepository";
import type {
  LeanCanvasDraft,
  ModuStartupDraft,
  ModuStartupInput,
  ParticipantInput,
  ParticipantOperationContext,
  PdfStatus
} from "@/lib/types";

type MirrorResult =
  | { ok: true; moduleSubmission: ModuleSubmissionRow }
  | { ok: false; reason: "missing_operation_context" | "mirror_failed"; error?: string };

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return JSON.stringify(error) || "unknown error";
}

function canMirror(
  operation?: ParticipantOperationContext
): operation is ParticipantOperationContext & { programId: string; participantId: string } {
  return Boolean(operation?.programId && operation.participantId);
}

async function markModuleCompleted(input: {
  programId: string;
  participantId: string;
  moduleSlug: string;
  sourceSubmissionId: string;
  title: string;
}) {
  try {
    await upsertModuleProgress({
      programId: input.programId,
      participantId: input.participantId,
      moduleSlug: input.moduleSlug,
      status: "completed",
      currentStep: 100,
      inputData: { sourceSubmissionId: input.sourceSubmissionId },
      outputData: { title: input.title }
    });
  } catch (error) {
    console.warn("[module-submission-mirror] progress sync failed", getErrorMessage(error));
  }
}

export async function mirrorLeanCanvasSubmission(input: {
  submissionId: string;
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}): Promise<MirrorResult> {
  const operation = input.participant.operation;
  if (!canMirror(operation)) return { ok: false, reason: "missing_operation_context" };

  try {
    const moduleSubmission = await createModuleSubmission({
      programId: operation.programId,
      participantId: operation.participantId,
      teamId: operation.teamId || null,
      moduleSlug: "lean-canvas",
      title: input.participant.ideaName || input.participant.ideaSummary || "린캔버스 제출",
      status: "submitted",
      pdfStatus: "idle",
      inputData: {
        source: "lean_canvas_submissions",
        sourceSubmissionId: input.submissionId,
        participant: input.participant
      },
      outputData: {
        canvas: input.canvas
      }
    });

    await markModuleCompleted({
      programId: operation.programId,
      participantId: operation.participantId,
      moduleSlug: "lean-canvas",
      sourceSubmissionId: input.submissionId,
      title: moduleSubmission.title
    });

    return { ok: true, moduleSubmission };
  } catch (error) {
    console.warn("[module-submission-mirror] lean canvas sync failed", getErrorMessage(error));
    return { ok: false, reason: "mirror_failed", error: getErrorMessage(error) };
  }
}

export async function mirrorModuStartupSubmission(input: {
  submissionId: string;
  participantInput: ModuStartupInput;
  draft: ModuStartupDraft;
}): Promise<MirrorResult> {
  const operation = input.participantInput.operation;
  if (!canMirror(operation)) return { ok: false, reason: "missing_operation_context" };

  try {
    const moduleSubmission = await createModuleSubmission({
      programId: operation.programId,
      participantId: operation.participantId,
      teamId: operation.teamId || null,
      moduleSlug: "modu-startup-application",
      title: input.participantInput.ideaTitle || input.participantInput.ideaOneLine || "모두의창업 제출",
      status: "submitted",
      pdfStatus: "idle",
      inputData: {
        source: "modu_startup_submissions",
        sourceSubmissionId: input.submissionId,
        input: input.participantInput
      },
      outputData: {
        draft: input.draft
      }
    });

    await markModuleCompleted({
      programId: operation.programId,
      participantId: operation.participantId,
      moduleSlug: "modu-startup-application",
      sourceSubmissionId: input.submissionId,
      title: moduleSubmission.title
    });

    return { ok: true, moduleSubmission };
  } catch (error) {
    console.warn("[module-submission-mirror] modu startup sync failed", getErrorMessage(error));
    return { ok: false, reason: "mirror_failed", error: getErrorMessage(error) };
  }
}

export async function mirrorPdfStatusToModuleSubmission(input: {
  source: "lean_canvas_submissions" | "modu_startup_submissions";
  sourceSubmissionId: string;
  pdfStatus: PdfStatus;
  pdfErrorMessage?: string;
}) {
  try {
    await updateModuleSubmissionPdfStatusBySource({
      source: input.source,
      sourceSubmissionId: input.sourceSubmissionId,
      pdfStatus: input.pdfStatus,
      pdfErrorMessage: input.pdfErrorMessage
    });
  } catch (error) {
    console.warn("[module-submission-mirror] pdf status sync failed", getErrorMessage(error));
  }
}

export async function deleteMirroredModuleSubmission(input: {
  source: "lean_canvas_submissions" | "modu_startup_submissions";
  sourceSubmissionId: string;
}) {
  try {
    await deleteModuleSubmissionsBySource(input);
  } catch (error) {
    console.warn("[module-submission-mirror] mirrored submission delete failed", getErrorMessage(error));
  }
}
