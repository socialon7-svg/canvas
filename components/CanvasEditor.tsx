"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  canvasLabels,
  emptyCanvasDraft,
  emptyParticipantInput,
  type CanvasFieldKey,
  type LeanCanvasDraft,
  type ParticipantInput
} from "@/lib/types";
import { loadDraftSession, saveDraftSession, saveSubmission } from "@/lib/storage";
import { recordParticipantSubmission } from "@/lib/operationsStorage";

const editableFields: CanvasFieldKey[] = [
  "problem",
  "existingAlternatives",
  "customerSegments",
  "uniqueValueProposition",
  "solution",
  "channels",
  "revenueStreams",
  "costStructure",
  "keyMetrics",
  "unfairAdvantage",
  "mentorComment"
];

const toText = (items: string[]) => items.join("\n");
const toItems = (value: string[]) => value.map((line) => line.trim()).filter(Boolean).slice(0, 3);

export default function CanvasEditor() {
  const router = useRouter();
  const [participant, setParticipant] = useState<ParticipantInput>(emptyParticipantInput);
  const [canvas, setCanvas] = useState<LeanCanvasDraft>(emptyCanvasDraft);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");

  useEffect(() => {
    const draft = loadDraftSession();
    if (!draft) {
      router.replace("/participant");
      return;
    }
    setParticipant(draft.participant);
    setCanvas(draft.canvas);
    setLoaded(true);
  }, [router]);

  const updateField = (key: CanvasFieldKey, value: string) => {
    const nextCanvas = { ...canvas, [key]: toItems(value.split("\n")) };
    setCanvas(nextCanvas);
    saveDraftSession({ participant, canvas: nextCanvas });
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    setFallbackNotice("");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          participant,
          canvas
        })
      });
      const data = (await response.json()) as {
        submission?: { id: string };
        code?: string;
        error?: string;
      };

      if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
        const fallbackSubmission = saveSubmission(participant, canvas);
        recordParticipantSubmission(participant, fallbackSubmission.id);
        setFallbackNotice("중앙 저장소가 아직 설정되지 않아 이 브라우저에 임시 저장했습니다.");
        router.push(`/preview/${fallbackSubmission.id}`);
        return;
      }

      if (!response.ok || !data.submission) {
        throw new Error(data.error || "제출 저장에 실패했습니다.");
      }

      recordParticipantSubmission(participant, data.submission.id);
      router.push(`/preview/${data.submission.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) {
    return <div className="mx-auto max-w-4xl px-5 py-10 text-sm text-gray-600">초안을 불러오는 중입니다...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">{participant.educationName || "교육명 미입력"}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">{participant.ideaName || "아이디어명 미입력"}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {participant.teamName || "팀명 미입력"} · {participant.participantName || "참가자명 미입력"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            onClick={() => router.push("/participant/canvas")}
          >
            입력으로 돌아가기
          </button>
          <button
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900 disabled:bg-gray-400"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "제출 중..." : "수정 완료 및 PDF 생성하기"}
          </button>
        </div>
      </header>

      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        AI 초안은 완성본이 아닙니다. 팀 상황에 맞게 문장을 직접 수정한 뒤 제출하세요.
      </div>
      {submitError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      ) : null}
      {fallbackNotice ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {fallbackNotice}
        </div>
      ) : null}

      <main className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {editableFields.map((key) => (
          <label key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <span className="mb-2 block text-sm font-bold text-gray-900">{canvasLabels[key]}</span>
            <textarea
              className="min-h-36 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={toText(canvas[key])}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </label>
        ))}
      </main>
    </div>
  );
}
