"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedServerDraft } from "@/hooks/useDebouncedServerDraft";
import { loadModuleDraft } from "@/lib/moduleDraftClient";
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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [serverDraftNotice, setServerDraftNotice] = useState("");
  const serverDraftData = useMemo<Record<string, unknown>>(() => ({ participant, canvas }), [canvas, participant]);
  const draftSave = useDebouncedServerDraft({
    programId: participant.operation?.programId,
    participantId: participant.operation?.participantId,
    moduleSlug: "lean-canvas",
    draftData: serverDraftData,
    currentStep: 1,
    enabled: loaded,
    shouldSave: Boolean(participant.operation?.programId && participant.operation?.participantId),
    debounceMs: 900
  });

  useEffect(() => {
    let cancelled = false;

    const draft = loadDraftSession();
    if (!draft) {
      router.replace("/participant");
      return;
    }
    const loadedDraft = draft;
    setParticipant(loadedDraft.participant);
    setCanvas(loadedDraft.canvas);
    setLoaded(true);

    async function restoreServerDraft() {
      const operation = loadedDraft.participant.operation;
      if (!operation?.programId || !operation.participantId) return;

      const savedDraft = await loadModuleDraft<{
        participant?: ParticipantInput;
        canvas?: LeanCanvasDraft;
      }>({
        programId: operation.programId,
        participantId: operation.participantId,
        moduleSlug: "lean-canvas"
      });

      if (cancelled || !savedDraft?.draftData) return;

      if (savedDraft.draftData.participant) {
        setParticipant({ ...emptyParticipantInput, ...loadedDraft.participant, ...savedDraft.draftData.participant });
      }
      if (savedDraft.draftData.canvas) {
        setCanvas({ ...emptyCanvasDraft, ...loadedDraft.canvas, ...savedDraft.draftData.canvas });
      }
      if (savedDraft.draftData.canvas || savedDraft.draftData.participant) {
        setServerDraftNotice(
          `${savedDraft.fallback ? "이 브라우저" : "서버"}에 저장된 수정 중 내용을 불러왔습니다.`
        );
      }
    }

    void restoreServerDraft();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateField = (key: CanvasFieldKey, value: string) => {
    const nextCanvas = { ...canvas, [key]: toItems(value.split("\n")) };
    setCanvas(nextCanvas);
    saveDraftSession({ participant, canvas: nextCanvas });
    setLastSavedAt(new Date());
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

  const completedFieldCount = editableFields.filter((key) => canvas[key].some((item) => item.trim())).length;
  const canvasProgress = Math.round((completedFieldCount / editableFields.length) * 100);

  if (!loaded) {
    return <div className="mx-auto max-w-4xl px-5 py-10 text-sm text-gray-600">초안을 불러오는 중입니다...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-5 sm:py-8">
      <header className="app-surface mb-5 p-5 sm:p-6">
        <button className="text-sm font-bold text-[#6b7684] hover:text-[#333d4b]" onClick={() => router.push("/participant/canvas")}>
          입력 정보로 돌아가기
        </button>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#3182f6]">린캔버스 · 2단계</p>
            <h1 className="mt-2 text-2xl font-bold text-[#191f28] sm:text-3xl">AI 초안 검토하기</h1>
            <p className="mt-2 text-sm text-[#6b7684]">
              {participant.ideaName || "아이디어명 미입력"} · {participant.teamName || "팀명 미입력"} · {participant.participantName || "참가자명 미입력"}
            </p>
            <p className="mt-1 text-xs text-[#8b95a1]">{participant.educationName || "교육명 미입력"}</p>
          </div>
          <span className="w-fit rounded-full bg-[#e8f3ff] px-3 py-1.5 text-sm font-bold text-[#1b64da]">
            {completedFieldCount}/{editableFields.length}개 항목 작성
          </span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e5e8eb]">
          <div className="h-full rounded-full bg-[#3182f6] transition-all" style={{ width: `${canvasProgress}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <p className="font-bold text-green-700">1. 정보 입력 완료</p>
          <p className="font-bold text-[#1b64da]">2. AI 초안 수정</p>
          <p className="font-bold text-[#8b95a1]">3. 제출·PDF 확인</p>
        </div>
      </header>

      <div className="mb-4 rounded-md border border-blue-100 bg-[#f2f7ff] px-4 py-3 text-sm text-[#1b64da]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">각 항목은 한 줄에 하나씩, 최대 3개까지 입력할 수 있어요.</p>
          <span className="text-xs font-semibold">
            {draftSave.status === "saving"
              ? "자동저장 중"
              : draftSave.status === "saved" && draftSave.lastSavedAt
                ? `${draftSave.fallbackMode ? "이 브라우저" : "서버"}에 저장됨 · ${new Date(draftSave.lastSavedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                : draftSave.status === "error"
                  ? `자동저장 실패 · ${draftSave.error}`
                  : serverDraftNotice ||
                    (lastSavedAt
                      ? `임시저장 · ${lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                      : "수정하면 자동저장돼요")}
          </span>
        </div>
      </div>
      {submitError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      ) : null}
      {fallbackNotice ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{fallbackNotice}</div>
      ) : null}

      <main className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {editableFields.map((key, index) => (
          <label key={key} className="app-surface p-4">
            <span className="mb-2 flex items-center justify-between gap-2 text-sm font-bold text-[#191f28]">
              <span>{index + 1}. {canvasLabels[key]}</span>
              <span className="text-xs font-semibold text-[#8b95a1]">{canvas[key].length}/3</span>
            </span>
            <textarea
              className="min-h-40 w-full resize-y rounded-md border border-[#d1d6db] px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-[#3182f6] focus:ring-3 focus:ring-blue-100"
              value={toText(canvas[key])}
              onChange={(event) => updateField(key, event.target.value)}
              onBlur={draftSave.saveNow}
            />
          </label>
        ))}
      </main>

      <section className="sticky bottom-3 mt-5 flex flex-col gap-3 rounded-lg border border-blue-100 bg-white/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#191f28]">수정 내용을 확인했나요?</p>
          <p className="mt-1 text-xs text-[#8b95a1]">제출 후 바로 접수번호와 PDF 미리보기를 확인할 수 있어요.</p>
        </div>
        <button
          className="app-primary-button w-full shrink-0 text-sm sm:w-auto"
          disabled={submitting || completedFieldCount === 0}
          onClick={submit}
        >
          {submitting ? "안전하게 제출하고 있어요" : "최종 제출하고 확인하기"}
        </button>
      </section>
    </div>
  );
}
