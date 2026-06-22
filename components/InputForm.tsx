"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyParticipantInput, type LeanCanvasDraft, type ParticipantInput } from "@/lib/types";
import { useDebouncedServerDraft } from "@/hooks/useDebouncedServerDraft";
import { loadModuleDraft } from "@/lib/moduleDraftClient";
import { loadOperationsState, toParticipantInput } from "@/lib/operationsStorage";
import {
  fetchParticipantWorkspace,
  mergeParticipantEntryIntoOperationsState,
  writeParticipantSession
} from "@/lib/participantSession";
import { getParticipantVisibleModules } from "@/lib/startupModules";
import {
  getParticipantIdeaContext,
  isDemoProgram,
  LEAN_CANVAS_MODULE_SLUG,
  mergeIdeaContextIntoParticipantInput
} from "@/lib/participantModuleFlow";
import {
  clearParticipantPrefill,
  loadDraftSession,
  loadParticipantPrefill,
  saveDraftSession
} from "@/lib/storage";

type ParticipantTextFieldKey = Exclude<keyof ParticipantInput, "operation">;

interface FieldConfig {
  key: ParticipantTextFieldKey;
  label: string;
  placeholder: string;
  helper: string;
  required?: boolean;
  multiline?: boolean;
  wide?: boolean;
}

const fields: FieldConfig[] = [
  {
    key: "educationName",
    label: "교육명",
    placeholder: "예: 2026 청년 창업 부트캠프",
    helper: "참여 중인 교육명 또는 프로그램명을 확인합니다.",
    required: true
  },
  {
    key: "teamName",
    label: "팀명",
    placeholder: "예: 팀 캔버스",
    helper: "결과물에 표시될 팀명을 입력합니다.",
    required: true
  },
  {
    key: "participantName",
    label: "참가자명",
    placeholder: "예: 김민지",
    helper: "대표 작성자 또는 제출자를 입력합니다.",
    required: true
  },
  {
    key: "ideaName",
    label: "아이디어명",
    placeholder: "예: AI 린캔버스 도우미",
    helper: "발표 자료에 그대로 쓸 수 있는 짧은 이름이 좋습니다.",
    required: true
  },
  {
    key: "ideaSummary",
    label: "아이디어 한 줄 설명",
    placeholder: "예: 창업교육생의 린캔버스 작성을 AI가 도와주는 서비스",
    helper: "누구의 어떤 문제를 어떤 방식으로 해결하는지 한 문장으로 적어주세요.",
    required: true,
    multiline: true,
    wide: true
  },
  {
    key: "targetCustomer",
    label: "대상 고객",
    placeholder: "예: 린캔버스를 처음 작성하는 예비창업팀",
    helper: "가장 먼저 돈을 내거나 적극적으로 사용할 고객을 구체적으로 적어주세요.",
    required: true,
    multiline: true
  },
  {
    key: "problemToSolve",
    label: "해결하고 싶은 문제",
    placeholder: "예: 각 항목에 무엇을 써야 할지 몰라 작성 시간이 오래 걸림",
    helper: "대상 고객이 겪는 가장 핵심적인 불편함이나 손실을 적어주세요.",
    required: true,
    multiline: true
  },
  {
    key: "existingAlternative",
    label: "현재 대안",
    placeholder: "예: 검색 자료, 멘토 피드백, 기존 양식 참고",
    helper: "고객이 지금 문제를 해결하기 위해 쓰는 방법을 적어주세요.",
    multiline: true
  },
  {
    key: "ourSolution",
    label: "우리의 해결책",
    placeholder: "예: 입력값을 기반으로 발표용 린캔버스 초안을 자동 생성",
    helper: "우리 제품이나 서비스가 문제를 해결하는 핵심 방식을 적어주세요.",
    required: true,
    multiline: true
  },
  {
    key: "revenueModel",
    label: "수익모델",
    placeholder: "예: 교육기관 월 구독, 캠프별 라이선스",
    helper: "누가, 왜, 어떤 방식으로 비용을 지불할지 적어주세요.",
    multiline: true
  },
  {
    key: "differentiation",
    label: "차별점",
    placeholder: "예: 교육 현장 양식에 맞춘 짧은 문장 자동 생성",
    helper: "기존 대안보다 더 낫거나 빠른 이유를 적어주세요.",
    multiline: true
  }
];

const fieldGroups: Array<{ title: string; keys: ParticipantTextFieldKey[] }> = [
  { title: "기본 정보", keys: ["educationName", "teamName", "participantName"] },
  { title: "아이디어 개요", keys: ["ideaName", "ideaSummary"] },
  {
    title: "비즈니스 모델",
    keys: ["targetCustomer", "problemToSolve", "existingAlternative", "ourSolution", "revenueModel", "differentiation"]
  }
];

const fieldByKey = Object.fromEntries(fields.map((field) => [field.key, field])) as Record<
  ParticipantTextFieldKey,
  FieldConfig
>;

const validateInput = (input: ParticipantInput) => {
  const fieldErrors: Partial<Record<ParticipantTextFieldKey, string>> = {};
  const requiredFields = fields.filter((field) => field.required).map((field) => field.key);

  requiredFields.forEach((key) => {
    if (!input[key]?.trim()) fieldErrors[key] = "필수 항목입니다.";
  });

  const ideaContext = [
    input.ideaSummary,
    input.targetCustomer,
    input.problemToSolve,
    input.ourSolution,
    input.revenueModel,
    input.differentiation
  ]
    .join(" ")
    .trim();

  if (!Object.keys(fieldErrors).length && ideaContext.length < 30) {
    fieldErrors.ideaSummary = "AI가 초안을 만들 수 있도록 핵심 내용을 조금 더 구체적으로 작성해주세요.";
  }

  return fieldErrors;
};

export default function InputForm({ requireParticipantSession = false }: { requireParticipantSession?: boolean }) {
  const router = useRouter();
  const fieldRefs = useRef<Partial<Record<ParticipantTextFieldKey, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const [input, setInput] = useState<ParticipantInput>(emptyParticipantInput);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ParticipantTextFieldKey, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [accessChecked, setAccessChecked] = useState(!requireParticipantSession);
  const serverDraftData = useMemo(() => ({ participant: input }), [input]);
  const draftSave = useDebouncedServerDraft({
    programId: input.operation?.programId,
    participantId: input.operation?.participantId,
    moduleSlug: "lean-canvas",
    draftData: serverDraftData,
    currentStep: 0,
    enabled: accessChecked,
    shouldSave: Boolean(input.operation?.programId && input.operation?.participantId),
    debounceMs: 900
  });

  useEffect(() => {
    let cancelled = false;
    const prefill = loadParticipantPrefill();
    const draft = loadDraftSession();

    const restoreServerDraft = async (baseInput: ParticipantInput) => {
      const operation = baseInput.operation;
      if (!operation?.programId || !operation.participantId) return;

      const savedDraft = await loadModuleDraft<{ participant?: ParticipantInput }>({
        programId: operation.programId,
        participantId: operation.participantId,
        moduleSlug: "lean-canvas"
      });

      if (cancelled || !savedDraft?.draftData?.participant) return;

      setInput({ ...emptyParticipantInput, ...baseInput, ...savedDraft.draftData.participant });
      setDraftNotice(
        `${savedDraft.fallback ? "이 브라우저" : "서버"}에 저장된 작성 중 내용을 불러왔습니다.`
      );
    };

    if (prefill && !requireParticipantSession) {
      const nextInput = { ...emptyParticipantInput, ...prefill };
      setInput(nextInput);
      setAccessChecked(true);
      void restoreServerDraft(nextInput);
    } else if (requireParticipantSession) {
      const browserInput = prefill || (draft?.participant.operation?.participantCode ? draft.participant : null);
      if (browserInput) setInput({ ...emptyParticipantInput, ...browserInput });

      fetchParticipantWorkspace()
        .then(({ response, data }) => {
          if (cancelled) return;
          if (response.ok && data.program && data.participant) {
            const visibleModules = getParticipantVisibleModules(data.program);
            if (!visibleModules.some((module) => module.slug === LEAN_CANVAS_MODULE_SLUG)) {
              router.replace("/participant?module=unavailable");
              return;
            }
            mergeParticipantEntryIntoOperationsState({
              program: data.program,
              participant: data.participant,
              team: data.team || null,
              feedbacks: data.feedbacks
            });
            const participantInput = toParticipantInput(data.program, data.participant, data.team || undefined);
            const nextInput = mergeIdeaContextIntoParticipantInput(
              browserInput
                ? { ...participantInput, ...browserInput, operation: participantInput.operation }
                : participantInput,
              getParticipantIdeaContext(data.participant)
            );
            setInput(nextInput);
            setAccessChecked(true);
            void restoreServerDraft(nextInput);
            return;
          }
          const localProgram = browserInput?.operation?.programId
            ? loadOperationsState().programs.find((program) => program.id === browserInput.operation?.programId)
            : undefined;
          const canUseLocalFallback =
            isDemoProgram(localProgram) ||
            (response.status === 503 &&
              (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY"));
          if (
            browserInput &&
            localProgram &&
            canUseLocalFallback &&
            getParticipantVisibleModules(localProgram).some((module) => module.slug === LEAN_CANVAS_MODULE_SLUG)
          ) {
            const nextInput = { ...emptyParticipantInput, ...browserInput };
            writeParticipantSession(browserInput.operation?.programId || "", browserInput.operation?.participantId || "");
            setInput(nextInput);
            setAccessChecked(true);
            void restoreServerDraft(nextInput);
            return;
          }
          router.replace("/participant");
        })
        .catch(() => {
          if (!cancelled) router.replace("/participant");
        });
    } else {
      setAccessChecked(true);
    }

    return () => {
      cancelled = true;
    };
  }, [requireParticipantSession, router]);

  const updateValue = (key: ParticipantTextFieldKey, value: string) => {
    setInput((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const focusFirstError = (errors: Partial<Record<ParticipantTextFieldKey, string>>) => {
    const firstKey = fields.find((field) => errors[field.key])?.key;
    if (!firstKey) return;
    const node = fieldRefs.current[firstKey];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    node?.focus();
  };

  const generate = async () => {
    setError("");
    const nextFieldErrors = validateInput(input);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("필수 항목을 확인해주세요.");
      focusFirstError(nextFieldErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = (await response.json()) as { canvas?: LeanCanvasDraft; error?: string };
      if (!response.ok || !data.canvas) {
        throw new Error(data.error || "AI 초안 생성에 실패했습니다.");
      }
      saveDraftSession({ participant: input, canvas: data.canvas });
      clearParticipantPrefill();
      router.push("/editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 응답을 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const hasError = Boolean(fieldErrors[field.key]);
    const fieldClassName = `w-full rounded-md border px-4 py-3 text-sm outline-none transition-colors focus:border-[#3182f6] focus:ring-3 focus:ring-blue-100 ${
      hasError ? "border-red-500 bg-red-50/40" : "border-gray-300 bg-white"
    }`;

    return (
      <label key={field.key} className={field.wide ? "md:col-span-2" : ""}>
        <span className="mb-1 block text-sm font-bold text-[#333d4b]">
          {field.label} {field.required ? <span className="text-red-600">*</span> : null}
        </span>
        <span className="mb-2 block text-xs leading-5 text-gray-500">{field.helper}</span>
        {field.multiline ? (
          <textarea
            ref={(node) => {
              fieldRefs.current[field.key] = node;
            }}
            className={`min-h-24 resize-y ${fieldClassName}`}
            placeholder={field.placeholder}
            value={input[field.key]}
            onChange={(event) => updateValue(field.key, event.target.value)}
            onBlur={draftSave.saveNow}
          />
        ) : (
          <input
            ref={(node) => {
              fieldRefs.current[field.key] = node;
            }}
            className={fieldClassName}
            placeholder={field.placeholder}
            value={input[field.key]}
            onChange={(event) => updateValue(field.key, event.target.value)}
            onBlur={draftSave.saveNow}
          />
        )}
        {hasError ? <span className="mt-1 block text-xs font-semibold text-red-600">{fieldErrors[field.key]}</span> : null}
      </label>
    );
  };

  if (!accessChecked) {
    return <div className="mx-auto max-w-4xl px-5 py-10 text-sm text-gray-600">참여자 정보를 확인하는 중입니다...</div>;
  }

  const requiredFields = fields.filter((field) => field.required);
  const completedRequiredFields = requiredFields.filter((field) => input[field.key].trim()).length;
  const requiredProgress = Math.round((completedRequiredFields / requiredFields.length) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-5 sm:py-8">
      <header className="app-surface mb-5 p-5 sm:p-6">
        <Link className="text-sm font-bold text-[#6b7684] hover:text-[#333d4b]" href="/participant">
          참여자 포털로 돌아가기
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
          <p className="text-sm font-bold text-[#3182f6]">린캔버스 · 1단계</p>
          <h1 className="mt-2 text-2xl font-bold text-[#191f28] sm:text-3xl">아이디어 정보 입력</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7684]">
            창업 아이디어를 입력하면 AI가 린캔버스 초안을 만들고, 수정 후 프로그램 산출물로 제출할 수 있습니다.
          </p>
          </div>
          <span className="w-fit rounded-full bg-[#e8f3ff] px-3 py-1.5 text-sm font-bold text-[#1b64da]">
            필수 {completedRequiredFields}/{requiredFields.length}
          </span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e5e8eb]">
          <div className="h-full rounded-full bg-[#3182f6] transition-all" style={{ width: `${requiredProgress}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <p className="font-bold text-[#1b64da]">1. 정보 입력</p>
          <p className="font-bold text-[#8b95a1]">2. AI 초안 수정</p>
          <p className="font-bold text-[#8b95a1]">3. 제출·PDF 확인</p>
        </div>
      </header>

      {input.operation?.participantCode ? (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          참여자 포털에서 불러온 정보입니다. 참여자 코드{" "}
          <span className="font-bold">{input.operation.participantCode}</span>, 프로그램 코드{" "}
          <span className="font-bold">{input.operation.programCode}</span>
          <span className="mt-1 block text-xs">
            {!draftSave.isOnline
              ? "오프라인 · 이 브라우저에 안전하게 저장합니다."
              : draftSave.status === "saving"
              ? "작성 내용을 자동저장 중입니다."
              : draftSave.status === "saved" && draftSave.lastSavedAt
                ? `${draftSave.fallbackMode ? "이 브라우저에" : "서버에"} 자동저장됨 · ${new Date(draftSave.lastSavedAt).toLocaleTimeString("ko-KR")}`
                : draftSave.status === "error"
                  ? `자동저장 실패: ${draftSave.error}`
                  : draftNotice || "작성 내용은 자동저장됩니다."}
          </span>
        </div>
      ) : null}

      <main className="app-surface p-5 sm:p-6">
        <div className="space-y-6">
          {fieldGroups.map((group) => (
            <fieldset key={group.title} className="border-t border-[#e5e8eb] pt-6 first:border-t-0 first:pt-0">
              <legend className="mb-4 text-lg font-bold text-[#191f28]">{group.title}</legend>
              <div className="grid gap-5 md:grid-cols-2">{group.keys.map((key) => renderField(fieldByKey[key]))}</div>
            </fieldset>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <div className="mt-1">입력값을 보완하거나 API 설정을 확인한 뒤 다시 생성하세요.</div>
          </div>
        ) : null}

        <div className="sticky bottom-3 mt-8 flex flex-col gap-2 rounded-lg border border-blue-100 bg-white/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="px-1">
            <p className="text-sm font-bold text-[#333d4b]">입력이 끝났나요?</p>
            <p className="mt-1 text-xs text-[#8b95a1]">다음 화면에서 AI 초안을 직접 수정할 수 있어요.</p>
          </div>
          <button
            className="app-primary-button w-full shrink-0 text-sm sm:w-auto"
            type="button"
            disabled={loading}
            onClick={generate}
          >
            {loading ? "AI가 초안을 만들고 있어요" : "다음: AI 초안 만들기"}
          </button>
        </div>
      </main>
    </div>
  );
}
