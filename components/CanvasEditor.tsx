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

  useEffect(() => {
    const draft = loadDraftSession();
    if (!draft) {
      router.replace("/");
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

  const submit = () => {
    const submission = saveSubmission(participant, canvas);
    router.push(`/preview/${submission.id}`);
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
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={() => router.push("/")}>
            입력으로 돌아가기
          </button>
          <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" onClick={submit}>
            최종 제출하기
          </button>
        </div>
      </header>

      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        각 항목은 줄바꿈으로 bullet을 나눕니다. 인쇄 품질을 위해 항목당 2~3줄, 줄당 짧은 문장을 권장합니다.
      </div>

      <main className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {editableFields.map((key) => (
          <label key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <span className="mb-2 block text-sm font-bold text-gray-900">{canvasLabels[key]}</span>
            <textarea
              className="min-h-36 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
              value={toText(canvas[key])}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </label>
        ))}
      </main>
    </div>
  );
}
