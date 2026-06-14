import type { PdfStatus, SubmissionStatus } from "@/lib/types";
import { STATUS_LABELS, type FeedbackProgressStatus, type ParticipantStatus } from "@/lib/status";

type StatusType = "participant" | "submission" | "feedback" | "pdf";
type StatusValue = ParticipantStatus | SubmissionStatus | FeedbackProgressStatus | PdfStatus;

export default function StatusBadge({ type, value }: { type: StatusType; value: StatusValue }) {
  const labels = STATUS_LABELS[type] as Record<string, string>;
  const label = labels[value] || String(value);

  return <span className={getStatusClassName(value)}>{label}</span>;
}

function getStatusClassName(value: StatusValue) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold";

  if (value === "failed" || value === "returned") {
    return `${base} bg-red-50 text-red-700 ring-1 ring-red-200`;
  }

  if (value === "submitted" || value === "reviewed" || value === "published" || value === "success") {
    return `${base} bg-green-50 text-green-700 ring-1 ring-green-200`;
  }

  if (value === "generating" || value === "pending") {
    return `${base} bg-amber-50 text-amber-800 ring-1 ring-amber-200`;
  }

  return `${base} bg-gray-100 text-gray-700 ring-1 ring-gray-200`;
}
