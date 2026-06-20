import type { ModuleSubmissionRow } from "@/lib/operationsRepository";
import type {
  LeanCanvasDraft,
  LeanCanvasSubmission,
  ModuStartupDraft,
  ModuStartupInput,
  ModuStartupSubmission,
  ParticipantInput,
  PdfStatus
} from "@/lib/types";

function normalizePdfStatus(value: unknown): PdfStatus {
  return value === "idle" || value === "generating" || value === "success" || value === "failed"
    ? value
    : "idle";
}

export function toLeanCanvasSubmission(row: ModuleSubmissionRow): LeanCanvasSubmission {
  return {
    id: row.id,
    createdAt: row.created_at,
    participant: (row.input_data.participant ?? {}) as ParticipantInput,
    canvas: (row.output_data.canvas ?? {}) as LeanCanvasDraft,
    submissionStatus: "submitted",
    pdfStatus: normalizePdfStatus(row.pdf_status),
    pdfErrorMessage: row.pdf_error_message ?? "",
    pdfGeneratedAt: row.pdf_generated_at ?? undefined
  };
}

export function toModuStartupSubmission(row: ModuleSubmissionRow): ModuStartupSubmission {
  return {
    id: row.id,
    createdAt: row.created_at,
    input: (row.input_data.input ?? {}) as ModuStartupInput,
    draft: (row.output_data.draft ?? {}) as ModuStartupDraft,
    submissionStatus: "submitted",
    pdfStatus: normalizePdfStatus(row.pdf_status),
    pdfErrorMessage: row.pdf_error_message ?? "",
    pdfGeneratedAt: row.pdf_generated_at ?? undefined
  };
}
