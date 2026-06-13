"use client";

import { canvasLabels, type CanvasFieldKey, type LeanCanvasSubmission } from "@/lib/types";

const topRow: CanvasFieldKey[] = ["problem", "solution", "uniqueValueProposition", "unfairAdvantage", "customerSegments"];
const bottomRow: CanvasFieldKey[] = ["existingAlternatives", "keyMetrics", "channels", "costStructure", "revenueStreams"];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 list-disc space-y-1 pl-4">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function CanvasCell({ submission, field }: { submission: LeanCanvasSubmission; field: CanvasFieldKey }) {
  return (
    <section className="print-avoid-break min-h-32 border border-gray-900 p-2">
      <h3 className="text-[11px] font-extrabold text-gray-950">{canvasLabels[field]}</h3>
      <BulletList items={submission.canvas[field]} />
    </section>
  );
}

export default function PrintableCanvas({ submission }: { submission: LeanCanvasSubmission }) {
  const createdAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(submission.createdAt));

  return (
    <article className="print-page mx-auto w-full max-w-[1120px] rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <header className="border-b-2 border-gray-950 pb-3">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-bold">교육명</span> {submission.participant.educationName || "-"}
          </p>
          <p>
            <span className="font-bold">팀명</span> {submission.participant.teamName || "-"}
          </p>
          <p>
            <span className="font-bold">참가자명</span> {submission.participant.participantName || "-"}
          </p>
          <p>
            <span className="font-bold">아이디어명</span> {submission.participant.ideaName || "-"}
          </p>
        </div>
        <p className="mt-2 text-[13px]">
          <span className="font-bold">한 줄 설명</span> {submission.participant.ideaSummary || "-"}
        </p>
      </header>

      <main className="mt-3 text-[10px] leading-snug">
        <div className="grid grid-cols-5">
          {topRow.map((field) => (
            <CanvasCell key={field} field={field} submission={submission} />
          ))}
          {bottomRow.map((field) => (
            <CanvasCell key={field} field={field} submission={submission} />
          ))}
        </div>
      </main>

      <footer className="mt-3 grid gap-3 border-t border-gray-900 pt-2 text-[10px] sm:grid-cols-[140px_1fr]">
        <p>
          <span className="font-bold">생성일</span>
          <br />
          {createdAt}
        </p>
        <div>
          <p className="font-bold">멘토 코멘트</p>
          <BulletList items={submission.canvas.mentorComment} />
        </div>
      </footer>
    </article>
  );
}
