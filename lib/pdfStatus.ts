import type { PdfStatus } from "@/lib/types";

export const PDF_GENERATION_TIMEOUT_MS = 10 * 60 * 1000;
export const INTERRUPTED_PDF_ERROR_MESSAGE =
  "이전 PDF 생성이 완료되지 않았습니다. 미리보기에서 다시 생성해주세요.";

export function isStalePdfGeneration(
  status: PdfStatus | string | undefined,
  statusUpdatedAt: string | undefined,
  now = Date.now()
) {
  if (status !== "generating") return false;
  if (!statusUpdatedAt) return true;

  const updatedAt = Date.parse(statusUpdatedAt);
  return !Number.isFinite(updatedAt) || now - updatedAt >= PDF_GENERATION_TIMEOUT_MS;
}
