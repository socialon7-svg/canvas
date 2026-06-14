import type { HighViewFeedback, HighViewParticipant, LeanCanvasSubmission, PdfStatus, SubmissionStatus } from "@/lib/types";

export type ParticipantStatus = "invited" | "entered" | "submitted";
export type FeedbackProgressStatus = "none" | "pending" | "published";

export const STATUS_LABELS = {
  participant: {
    invited: "초대",
    entered: "입장 완료",
    submitted: "제출 완료"
  },
  submission: {
    draft: "작성 중",
    submitted: "제출 완료",
    reviewed: "검토 완료",
    returned: "수정 요청"
  },
  feedback: {
    none: "피드백 없음",
    pending: "피드백 대기",
    published: "피드백 완료"
  },
  pdf: {
    idle: "PDF 대기",
    generating: "PDF 생성 중",
    success: "PDF 생성 완료",
    failed: "PDF 생성 실패"
  }
} as const;

export function getParticipantStatus(participant: HighViewParticipant, submission?: LeanCanvasSubmission): ParticipantStatus {
  if (submission || participant.latestSubmissionId) return "submitted";
  if (participant.joinedAt) return "entered";
  return "invited";
}

export function getSubmissionStatus(submission?: LeanCanvasSubmission): SubmissionStatus {
  return submission?.submissionStatus || (submission ? "submitted" : "draft");
}

export function getFeedbackProgressStatus(feedback?: HighViewFeedback): FeedbackProgressStatus {
  return feedback ? "published" : "none";
}

export function getPdfStatus(submission?: LeanCanvasSubmission): PdfStatus {
  return submission?.pdfStatus || (submission ? "success" : "idle");
}
