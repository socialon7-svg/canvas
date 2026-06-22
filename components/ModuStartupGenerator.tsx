"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ModuStartupDraft, ModuStartupInput, ModuStartupSubmission } from "@/lib/types";
import { useDebouncedServerDraft } from "@/hooks/useDebouncedServerDraft";
import { loadModuleDraft } from "@/lib/moduleDraftClient";
import {
  clearModuStartupPrefill,
  loadModuStartupPrefill,
  saveModuStartupSubmission
} from "@/lib/storage";
import { loadOperationsState, recordModuStartupSubmission, toModuStartupInput } from "@/lib/operationsStorage";
import {
  fetchParticipantWorkspace,
  mergeParticipantEntryIntoOperationsState,
  writeParticipantSession
} from "@/lib/participantSession";
import { getParticipantVisibleModules } from "@/lib/startupModules";
import {
  getParticipantIdeaContext,
  isDemoProgram,
  mergeIdeaContextIntoModuStartupInput,
  MODU_STARTUP_MODULE_SLUG
} from "@/lib/participantModuleFlow";
import { getOrCreateSubmissionRequestId } from "@/lib/submissionRequest";
import ParticipantNextModuleButton from "@/components/ParticipantNextModuleButton";

const initialInput: ModuStartupInput = {
  programName: "",
  teamName: "",
  participantName: "",
  ideaTitle: "",
  ideaOneLine: "",
  backgroundStory: "",
  customerProblem: "",
  executionPlan: "",
  category: "",
  businessStatus: "현재 사업자 아님",
  teamMembers: "",
  videoUrl: ""
};

const MODU_STARTUP_DRAFT_KEY = "modu-startup-current-draft";

const moduStartupSteps = [
  {
    id: "basic",
    title: "기본 정보",
    description: "교육명, 팀명, 참가자명, 아이디어명을 확인합니다."
  },
  {
    id: "intro",
    title: "한 줄 소개",
    description: "무엇을, 누구를 위해, 어떻게 제공하는지 적습니다."
  },
  {
    id: "problem",
    title: "배경과 문제",
    description: "직접 겪은 장면과 고객 문제를 적습니다."
  },
  {
    id: "execution",
    title: "실행 계획",
    description: "베타 유저, 인터뷰, 매출, MOU 등 증거를 적습니다."
  },
  {
    id: "team",
    title: "분야와 팀",
    description: "분야, 창업 여부, 팀원, 영상 링크를 정리합니다."
  },
  {
    id: "generate",
    title: "초안 생성",
    description: "입력값을 바탕으로 AI 초안을 생성합니다."
  }
] as const;

type ModuStartupStepId = (typeof moduStartupSteps)[number]["id"];

type DraftTextKey = Exclude<keyof ModuStartupDraft, "evidenceLines" | "policyKeywords" | "finalChecklist">;
type DraftArrayKey = "evidenceLines" | "policyKeywords" | "finalChecklist";

const categoryOptions = ["AI", "로컬", "ESG", "글로벌", "DX", "소상공인", "교육", "기타"];

const businessStatusOptions = [
  "현재 사업자 아님",
  "현재 사업자",
  "예비창업패키지/정부지원사업 수행 중",
  "확인 필요"
];

const draftTextFields: Array<{ key: DraftTextKey; label: string; help: string; rows: number }> = [
  {
    key: "openingHook",
    label: "첫 문장 훅",
    help: "심사위원이 바로 다음 문장을 읽고 싶게 만드는 첫 문장입니다.",
    rows: 2
  },
  {
    key: "q1IdeaIntro",
    label: "Q1. 한 줄 소개",
    help: "무엇을, 누구를 위해, 어떻게 하는지 한 줄로 정리합니다.",
    rows: 2
  },
  {
    key: "q2BackgroundStory",
    label: "Q2. 배경 이야기",
    help: "직접 겪었거나 관찰한 장면 중심으로 작성합니다.",
    rows: 4
  },
  {
    key: "q3CustomerProblem",
    label: "Q3. 고객과 문제",
    help: "고객군을 좁히고 문제를 숫자와 상황으로 설명합니다.",
    rows: 4
  },
  {
    key: "q4ExecutionPlan",
    label: "Q4. 실행 계획",
    help: "베타 유저, 매출, MOU, 특허, 수상 등 증거로 보강합니다.",
    rows: 4
  },
  {
    key: "q5CategoryReason",
    label: "Q5. 분야 선택 이유",
    help: "분야와 정책 키워드가 아이디어와 자연스럽게 이어지게 합니다.",
    rows: 3
  },
  {
    key: "q6BusinessStatusCheck",
    label: "Q6. 창업 여부 확인",
    help: "중복 지원 위험과 현재 사업자 여부를 점검합니다.",
    rows: 3
  },
  {
    key: "q7TeamIntro",
    label: "Q7. 팀 소개",
    help: "팀원의 역할과 실행 역량을 짧게 정리합니다.",
    rows: 3
  },
  {
    key: "q8VideoPitch",
    label: "Q8. 영상 제출 구성",
    help: "60초 영상에 담을 순서와 핵심 메시지를 제안합니다.",
    rows: 3
  },
  {
    key: "personaDefinition",
    label: "핵심 페르소나",
    help: "한 명의 명확한 고객처럼 좁혀 적습니다.",
    rows: 2
  },
  {
    key: "differentiationFocus",
    label: "차별점 1개",
    help: "여러 장점보다 가장 강한 차별점 하나에 집중합니다.",
    rows: 2
  },
  {
    key: "socialImpactEnding",
    label: "사회적 임팩트 마무리",
    help: "개인 성공보다 고객, 지역, 사회 변화로 마무리합니다.",
    rows: 2
  },
  {
    key: "mentorComment",
    label: "보완 코멘트",
    help: "최종 제출 전 우선 보완할 점입니다.",
    rows: 3
  }
];

const draftArrayFields: Array<{ key: DraftArrayKey; label: string; help: string; rows: number }> = [
  {
    key: "evidenceLines",
    label: "증거 한 줄",
    help: "숫자, 출처, 베타 유저, 매출, MOU 같은 객관 증거를 줄 단위로 정리합니다.",
    rows: 5
  },
  {
    key: "policyKeywords",
    label: "정책 키워드",
    help: "AI, 로컬, ESG, 글로벌, DX 중 어울리는 2~3개만 남깁니다.",
    rows: 3
  },
  {
    key: "finalChecklist",
    label: "최종 제출 전 체크리스트",
    help: "24시간 묵힌 뒤 다시 확인할 항목입니다.",
    rows: 6
  }
];

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDraft(input: ModuStartupInput, draft: ModuStartupDraft) {
  const lines = [
    `[모두의창업 초안] ${input.ideaTitle || input.ideaOneLine || "아이디어"}`,
    "",
    `프로그램: ${input.programName || "-"}`,
    `팀명: ${input.teamName || "-"}`,
    `작성자: ${input.participantName || "-"}`,
    "",
    `첫 문장 훅: ${draft.openingHook}`,
    "",
    `Q1. 한 줄 소개\n${draft.q1IdeaIntro}`,
    "",
    `Q2. 배경 이야기\n${draft.q2BackgroundStory}`,
    "",
    `Q3. 고객과 문제\n${draft.q3CustomerProblem}`,
    "",
    `Q4. 실행 계획\n${draft.q4ExecutionPlan}`,
    "",
    `Q5. 분야 선택 이유\n${draft.q5CategoryReason}`,
    "",
    `Q6. 창업 여부 확인\n${draft.q6BusinessStatusCheck}`,
    "",
    `Q7. 팀 소개\n${draft.q7TeamIntro}`,
    "",
    `Q8. 영상 제출 구성\n${draft.q8VideoPitch}`,
    "",
    `핵심 페르소나\n${draft.personaDefinition}`,
    "",
    `차별점 1개\n${draft.differentiationFocus}`,
    "",
    `증거 한 줄\n${draft.evidenceLines.map((item) => `- ${item}`).join("\n")}`,
    "",
    `정책 키워드\n${draft.policyKeywords.map((item) => `- ${item}`).join("\n")}`,
    "",
    `사회적 임팩트 마무리\n${draft.socialImpactEnding}`,
    "",
    `최종 제출 전 체크리스트\n${draft.finalChecklist.map((item) => `- ${item}`).join("\n")}`,
    "",
    `보완 코멘트\n${draft.mentorComment}`
  ];

  return lines.join("\n");
}

function hasMeaningfulInput(input: ModuStartupInput) {
  return [
    input.programName,
    input.teamName,
    input.participantName,
    input.ideaTitle,
    input.ideaOneLine,
    input.backgroundStory,
    input.customerProblem,
    input.executionPlan,
    input.category,
    input.teamMembers,
    input.videoUrl
  ].some((value) => value.trim());
}

function saveModuStartupDraftToLocal(input: ModuStartupInput) {
  try {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(
      MODU_STARTUP_DRAFT_KEY,
      JSON.stringify({
        input,
        savedAt
      })
    );
    return savedAt;
  } catch {
    return "";
  }
}

function loadModuStartupDraftFromLocal(): { input: ModuStartupInput; savedAt: string } | null {
  try {
    const raw = window.localStorage.getItem(MODU_STARTUP_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { input?: ModuStartupInput; savedAt?: string };
    if (!parsed.input || !parsed.savedAt) return null;
    return { input: parsed.input, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function clearModuStartupDraftFromLocal() {
  try {
    window.localStorage.removeItem(MODU_STARTUP_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export default function ModuStartupGenerator() {
  const router = useRouter();
  const [input, setInput] = useState<ModuStartupInput>(initialInput);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draft, setDraft] = useState<ModuStartupDraft | null>(null);
  const [submittedSubmission, setSubmittedSubmission] = useState<ModuStartupSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetRequested, setResetRequested] = useState(false);
  const [localDraftToResume, setLocalDraftToResume] = useState<{
    input: ModuStartupInput;
    savedAt: string;
  } | null>(null);

  const printableText = useMemo(() => (draft ? formatDraft(input, draft) : ""), [draft, input]);
  const serverDraftData = useMemo<Record<string, unknown>>(() => ({ input, draft }), [draft, input]);
  const currentStepMeta = moduStartupSteps[currentStep];
  const currentStepId: ModuStartupStepId = currentStepMeta.id;
  const progressPercent = Math.round(((currentStep + 1) / moduStartupSteps.length) * 100);
  const hasParticipantContext = Boolean(input.operation?.programId && input.operation?.participantId);
  const draftSave = useDebouncedServerDraft({
    programId: input.operation?.programId,
    participantId: input.operation?.participantId,
    moduleSlug: "modu-startup-application",
    draftData: serverDraftData,
    currentStep,
    enabled: draftReady && !submittedSubmission,
    shouldSave: Boolean(input.operation?.programId && input.operation?.participantId && hasMeaningfulInput(input)),
    debounceMs: 900
  });

  useEffect(() => {
    let cancelled = false;
    const prefill = loadModuStartupPrefill();
    const savedDraft = loadModuStartupDraftFromLocal();
    const browserInput = prefill ? { ...initialInput, ...prefill } : initialInput;

    if (savedDraft) {
      setLocalDraftToResume(savedDraft);
      if (prefill) setInput(browserInput);
    } else if (prefill) {
      setInput(browserInput);
    }

    async function restoreServerDraft(baseInput: ModuStartupInput) {
      const operation = baseInput.operation;
      if (!operation?.programId || !operation.participantId) {
        setDraftReady(true);
        return;
      }

      const savedServerDraft = await loadModuleDraft<{
        input?: ModuStartupInput;
        draft?: ModuStartupDraft | null;
      }>({
        programId: operation.programId,
        participantId: operation.participantId,
        moduleSlug: "modu-startup-application"
      });

      if (cancelled) return;

      if (savedServerDraft?.draftData) {
        setLocalDraftToResume(null);
        if (savedServerDraft.draftData.input) {
          setInput({ ...baseInput, ...savedServerDraft.draftData.input });
        }
        if (savedServerDraft.draftData.draft) {
          setDraft(savedServerDraft.draftData.draft);
        }
        setCurrentStep(savedServerDraft.currentStep);
        setNotice(`${savedServerDraft.fallback ? "이 브라우저" : "서버"}에 저장된 모두의창업 작성 중 내용을 불러왔습니다.`);
      }
      setDraftReady(true);
    }

    async function initialize() {
      let baseInput = browserInput;
      try {
        const { response, data } = await fetchParticipantWorkspace();
        if (cancelled) return;
        if (response.ok && data.program && data.participant) {
          const visibleModules = getParticipantVisibleModules(data.program);
          if (!visibleModules.some((module) => module.slug === MODU_STARTUP_MODULE_SLUG)) {
            router.replace("/participant?module=unavailable");
            return;
          }
          mergeParticipantEntryIntoOperationsState({
            program: data.program,
            participant: data.participant,
            team: data.team || null,
            feedbacks: data.feedbacks
          });
          const participantInput = mergeIdeaContextIntoModuStartupInput(
            toModuStartupInput(data.program, data.participant, data.team || undefined),
            getParticipantIdeaContext(data.participant)
          );
          baseInput = prefill
            ? { ...participantInput, ...prefill, operation: participantInput.operation }
            : participantInput;
          setInput(baseInput);
        } else {
          const localProgram = browserInput.operation?.programId
            ? loadOperationsState().programs.find((program) => program.id === browserInput.operation?.programId)
            : undefined;
          const canUseLocalFallback =
            isDemoProgram(localProgram) ||
            (response.status === 503 &&
              (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY"));
          if (localProgram && canUseLocalFallback) {
            const isEnabled = getParticipantVisibleModules(localProgram).some(
              (module) => module.slug === MODU_STARTUP_MODULE_SLUG
            );
            if (!isEnabled) {
              router.replace("/participant?module=unavailable");
              return;
            }
            writeParticipantSession(
              browserInput.operation?.programId || "",
              browserInput.operation?.participantId || ""
            );
          } else if ([401, 403, 404].includes(response.status)) {
            router.replace("/participant");
            return;
          }
        }
      } catch {
        // Standalone demo input remains available; submission still requires a valid participant session.
      }
      await restoreServerDraft(baseInput);
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!draftReady || submittedSubmission || !hasMeaningfulInput(input)) return;

    const timer = window.setTimeout(() => {
      const savedAt = saveModuStartupDraftToLocal(input);
      if (savedAt) setLastSavedAt(savedAt);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [draftReady, input, submittedSubmission]);

  useEffect(() => {
    if (!resetRequested) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setResetRequested(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [resetRequested]);

  const updateInput = <K extends keyof ModuStartupInput>(key: K, value: ModuStartupInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const updateDraftText = (key: DraftTextKey, value: string) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateDraftArray = (key: DraftArrayKey, value: string) => {
    setDraft((current) => (current ? { ...current, [key]: splitLines(value) } : current));
  };

  const validateBeforeStep = (nextStep: number) => {
    if (nextStep > 1 && !input.ideaTitle.trim() && !input.ideaOneLine.trim()) {
      setCurrentStep(1);
      setError("아이디어명 또는 한 줄 소개 중 하나를 입력해주세요.");
      return false;
    }
    if (nextStep > 2 && !input.backgroundStory.trim() && !input.customerProblem.trim()) {
      setCurrentStep(2);
      setError("배경 이야기 또는 고객 문제 중 하나를 입력해주세요.");
      return false;
    }
    if (nextStep >= 5 && !input.executionPlan.trim()) {
      setNotice("실행 계획이 비어 있습니다. 생성은 가능하지만 인터뷰·매출·실험 계획을 적으면 초안이 더 구체적입니다.");
    }
    setError("");
    return true;
  };

  const generateDraft = async () => {
    if (!hasParticipantContext) {
      setError("참여자 포털에서 입장한 뒤 AI 초안을 만들 수 있습니다.");
      return;
    }
    if (!validateBeforeStep(moduStartupSteps.length - 1)) return;
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/generate-modu-startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = (await response.json()) as { draft?: ModuStartupDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "초안 생성에 실패했습니다.");
      }

      setDraft(data.draft);
      setSubmittedSubmission(null);
      setNotice("초안이 생성되었습니다. 그대로 쓰기보다 현장 경험과 실제 숫자를 한 번 더 확인하세요.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "초안 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = async () => {
    if (!printableText) return;

    try {
      await navigator.clipboard.writeText(printableText);
      setNotice("초안을 클립보드에 복사했습니다.");
    } catch {
      setError("브라우저 권한 때문에 복사하지 못했습니다. 아래 내용을 직접 선택해 복사해주세요.");
    }
  };

  const submitDraft = async () => {
    if (!draft) return;
    if (!hasParticipantContext) {
      setError("참여자 포털에서 입장한 뒤 운영 시스템에 제출할 수 있습니다.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    const submissionPayload = { input, draft };
    const submissionScope = `${input.operation?.programId || "demo"}:${input.operation?.participantId || "browser"}:modu-startup-application`;
    const submissionRequestId = getOrCreateSubmissionRequestId(submissionScope, submissionPayload);

    try {
      const response = await fetch("/api/modu-startup-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionRequestId, ...submissionPayload })
      });
      const data = (await response.json()) as {
        submission?: ModuStartupSubmission;
        code?: string;
        error?: string;
      };

      if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
        const fallbackSubmission = saveModuStartupSubmission(input, draft, submissionRequestId);
        recordModuStartupSubmission(input, fallbackSubmission.id);
        clearModuStartupPrefill();
        clearModuStartupDraftFromLocal();
        setLastSavedAt("");
        setSubmittedSubmission(fallbackSubmission);
        setNotice("중앙 저장소가 아직 준비되지 않아 이 브라우저에 임시 제출 저장했습니다.");
        return;
      }

      if (!response.ok || !data.submission) {
        throw new Error(data.error || "모두의창업 제출 저장에 실패했습니다.");
      }

      recordModuStartupSubmission(input, data.submission.id);
      clearModuStartupPrefill();
      clearModuStartupDraftFromLocal();
      setLastSavedAt("");
      setSubmittedSubmission(data.submission);
      setNotice("모두의창업 초안이 운영 시스템에 제출되었습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "모두의창업 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const performReset = () => {
    const operation = input.operation;
    setInput(
      operation
        ? {
            ...initialInput,
            programName: operation.programName || input.programName,
            teamName: operation.teamName || input.teamName,
            participantName: input.participantName,
            operation
          }
        : initialInput
    );
    setCurrentStep(0);
    setDraft(null);
    setSubmittedSubmission(null);
    setError("");
    setNotice("");
    setLastSavedAt("");
    setLocalDraftToResume(null);
    setResetRequested(false);
    if (!operation) clearModuStartupPrefill();
    clearModuStartupDraftFromLocal();
  };

  const requestReset = () => {
    if (!hasMeaningfulInput(input) && !draft) {
      performReset();
      return;
    }
    setResetRequested(true);
  };

  const moveStep = (nextStep: number) => {
    if (nextStep > currentStep && !validateBeforeStep(nextStep)) return;
    setCurrentStep(Math.max(0, Math.min(moduStartupSteps.length - 1, nextStep)));
  };

  const nextStepLabels = [
    "다음: 한 줄 소개",
    "다음: 문제 작성",
    "다음: 실행 근거 작성",
    "다음: 분야와 팀",
    "다음: AI 초안 만들기",
    "AI 초안 만들기"
  ];

  const renderStepFields = () => {
    switch (currentStepId) {
      case "basic":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">교육명</span>
                <input
                  className="app-input text-sm"
                  value={input.programName}
                  onChange={(event) => updateInput("programName", event.target.value)}
                  placeholder="예: 모두의창업 캠프"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">팀명</span>
                <input
                  className="app-input text-sm"
                  value={input.teamName}
                  onChange={(event) => updateInput("teamName", event.target.value)}
                  placeholder="예: 하이팀"
                />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">참가자명</span>
              <input
                className="app-input text-sm"
                value={input.participantName}
                onChange={(event) => updateInput("participantName", event.target.value)}
                placeholder="예: 김하이"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">아이디어명</span>
              <input
                className="app-input text-sm"
                value={input.ideaTitle}
                onChange={(event) => updateInput("ideaTitle", event.target.value)}
                placeholder="예: 1인 브런치 카페 운영 도우미"
              />
            </label>
          </div>
        );
      case "intro":
        return (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">Q1. 한 줄 소개</span>
            <input
              className="app-input text-sm"
              maxLength={120}
              value={input.ideaOneLine}
              onChange={(event) => updateInput("ideaOneLine", event.target.value)}
              placeholder="무엇을, 누구를 위해, 어떻게"
            />
            <span className="mt-1 block text-right text-xs text-gray-400">{input.ideaOneLine.length} / 120자</span>
          </label>
        );
      case "problem":
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q2. 배경 이야기</span>
              <textarea
                className="app-input min-h-32 h-auto py-3 text-sm"
                value={input.backgroundStory}
                onChange={(event) => updateInput("backgroundStory", event.target.value)}
                placeholder="직접 겪은 장면, 관찰한 순간, 왜 시작했는지"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q3. 고객과 문제</span>
              <textarea
                className="app-input min-h-32 h-auto py-3 text-sm"
                value={input.customerProblem}
                onChange={(event) => updateInput("customerProblem", event.target.value)}
                placeholder="좁은 고객군, 해결하려는 문제, 현재 대안"
              />
            </label>
          </div>
        );
      case "execution":
        return (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">Q4. 실행 계획과 증거</span>
            <textarea
              className="app-input min-h-40 h-auto py-3 text-sm"
              value={input.executionPlan}
              onChange={(event) => updateInput("executionPlan", event.target.value)}
              placeholder="베타 유저, 인터뷰, 매출, MOU, 수상, 특허 등"
            />
          </label>
        );
      case "team":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">Q5. 분야</span>
                <select
                  className="app-input text-sm"
                  value={input.category}
                  onChange={(event) => updateInput("category", event.target.value)}
                >
                  <option value="">분야 선택</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">Q6. 창업 여부</span>
                <select
                  className="app-input text-sm"
                  value={input.businessStatus}
                  onChange={(event) => updateInput("businessStatus", event.target.value)}
                >
                  {businessStatusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q7. 팀원</span>
              <input
                className="app-input text-sm"
                value={input.teamMembers}
                onChange={(event) => updateInput("teamMembers", event.target.value)}
                placeholder="예: 김하이-기획, 박뷰-개발"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q8. 영상 링크</span>
              <input
                className="app-input text-sm"
                value={input.videoUrl}
                onChange={(event) => updateInput("videoUrl", event.target.value)}
                placeholder="https://"
              />
            </label>
          </div>
        );
      case "generate":
      default:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <p className="font-bold">생성 전 빠른 확인</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>아이디어: {input.ideaTitle || input.ideaOneLine || "아직 미입력"}</li>
                <li>고객/문제: {input.customerProblem ? "입력됨" : "비어 있음"}</li>
                <li>실행 증거: {input.executionPlan ? "입력됨" : "비어 있음"}</li>
                <li>분야/창업 여부: {input.category || "분야 미선택"} · {input.businessStatus}</li>
              </ul>
            </div>
            <button
              className="app-primary-button w-full text-sm"
              disabled={loading || !hasParticipantContext}
              onClick={generateDraft}
              type="button"
            >
              {loading ? "AI 초안 생성 중..." : hasParticipantContext ? "AI 모두의창업 초안 생성" : "참여자 입장 후 생성 가능"}
            </button>
          </div>
        );
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-5 sm:py-8">
      <section className="app-surface no-print mb-5 overflow-hidden border-blue-100 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#3182f6]">모두의창업 · AI 작성 도구</p>
            <h1 className="mt-1 text-2xl font-bold text-[#191f28] sm:text-3xl">신청서 초안을 단계별로 완성해요</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7684]">
              핵심 정보만 입력하면 Q1~Q8 초안을 만들고, 직접 다듬어 운영 시스템에 제출할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              {[
                { label: "1. 아이디어 정리", done: currentStep >= 2 },
                { label: "2. 근거 입력", done: currentStep >= 4 },
                { label: "3. 초안 생성·제출", done: Boolean(draft) }
              ].map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full px-3 py-1.5 ${item.done ? "bg-[#e8f3ff] text-[#1b64da]" : "bg-[#f2f4f6] text-[#6b7684]"}`}
                >
                  {item.done ? "완료 · " : ""}{item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="app-secondary-button inline-flex items-center text-sm" href="/participant">
              참여자 홈
            </Link>
            <button className="app-secondary-button text-sm text-red-600" onClick={requestReset} type="button">
              새로 작성
            </button>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#f2f4f6]" aria-label={`작성 진행률 ${progressPercent}%`}>
          <div className="h-full rounded-full bg-[#3182f6] transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      {notice ? (
        <p className="no-print mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="no-print mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {localDraftToResume ? (
        <section className="app-surface no-print mb-5 border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-700">이전에 작성하던 내용이 있어요</p>
          <h2 className="mt-1 text-lg font-bold text-[#191f28]">저장된 내용부터 이어서 작성할까요?</h2>
          <p className="mt-2 text-sm text-[#6b7684]">
            마지막 저장 {new Date(localDraftToResume.savedAt).toLocaleString("ko-KR")}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              className="app-primary-button text-sm"
              onClick={() => {
                setInput((current) => ({ ...current, ...localDraftToResume.input }));
                setLastSavedAt(localDraftToResume.savedAt);
                setLocalDraftToResume(null);
                setNotice("이전에 작성하던 내용을 불러왔습니다.");
              }}
              type="button"
            >
              이어서 작성
            </button>
            <button
              className="app-secondary-button text-sm"
              onClick={() => {
                clearModuStartupDraftFromLocal();
                setLocalDraftToResume(null);
                setNotice("이전 임시 저장을 지우고 새로 작성합니다.");
              }}
              type="button"
            >
              새로 작성
            </button>
          </div>
        </section>
      ) : null}

      {submittedSubmission ? (
        <section className="app-surface no-print mb-5 border-green-200 bg-green-50 p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-green-700">제출 완료</p>
              <h2 className="mt-1 text-xl font-bold text-[#191f28]">
                제출이 정상적으로 접수됐어요
              </h2>
              <p className="mt-2 text-sm leading-6 text-green-900">
                제출번호 {submittedSubmission.id.slice(0, 8).toUpperCase()} ·{" "}
                {new Date(submittedSubmission.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ParticipantNextModuleButton currentSlug="modu-startup-application" />
              <Link
                className="app-primary-button inline-flex items-center text-sm"
                href={`/modu-startup/preview/${submittedSubmission.id}`}
              >
                제출물 열람
              </Link>
              <Link className="app-secondary-button inline-flex items-center text-sm" href="/participant">
                참여자 포털
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="app-surface no-print p-5 sm:p-6" onBlurCapture={draftSave.saveNow}>
          <h2 className="text-lg font-bold text-[#191f28]">입력 정보</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7684]">
            내용이 부족해도 생성은 가능하지만, 숫자 2개 이상과 직접 경험 한 문장을 넣으면 결과가 좋아집니다.
          </p>

          {hasParticipantContext ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <p className="font-bold">운영 시스템 연동됨</p>
              <p className="mt-1">
                참가자 코드 {input.operation?.participantCode || "확인됨"} · {input.operation?.teamName || input.teamName || "팀 미배정"}
                으로 제출 현황이 기록됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">참여자 입장이 필요해요</p>
              <p className="mt-1 leading-6 text-amber-900">
                교육 정보와 제출 대상을 안전하게 연결하기 위해 참여자 포털에서 먼저 입장해주세요. 작성 화면으로 다시 돌아오면 입력값이 자동 연동됩니다.
              </p>
              <Link className="app-secondary-button mt-3 inline-flex min-h-10 items-center border-amber-300 text-sm text-amber-900" href="/participant">
                참여자 포털에서 입장
              </Link>
            </div>
          )}

          <div className="mt-5">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8b95a1]">
                <span>
                  {currentStep + 1} / {moduStartupSteps.length} · {currentStepMeta.title}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2f4f6]">
                <div className="h-full rounded-full bg-[#3182f6] transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {moduStartupSteps.map((step, index) => (
                <button
                  key={step.id}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${
                    currentStep === index
                      ? "border-[#3182f6] bg-[#3182f6] text-white"
                      : index < currentStep
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-[#e5e8eb] bg-white text-[#6b7684] hover:bg-[#f7f8fa]"
                  }`}
                  onClick={() => moveStep(index)}
                  type="button"
                >
                  {index + 1}. {step.title}
                </button>
              ))}
            </div>

            <section className="rounded-lg border border-[#e5e8eb] bg-[#f7f8fa] p-4 sm:p-5">
              <p className="text-sm font-bold text-[#191f28]">{currentStepMeta.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#6b7684]">{currentStepMeta.description}</p>
              <div className="mt-4">{renderStepFields()}</div>
            </section>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#8b95a1]" aria-live="polite">
                {!draftSave.isOnline
                  ? "오프라인 · 이 브라우저에 안전하게 저장합니다"
                  : draftSave.status === "saving"
                  ? "자동저장 중..."
                  : draftSave.status === "saved" && draftSave.lastSavedAt
                    ? `${draftSave.fallbackMode ? "이 브라우저에" : "서버에"} 자동저장됨 · ${new Date(draftSave.lastSavedAt).toLocaleTimeString("ko-KR")}`
                    : draftSave.status === "error"
                      ? `자동저장 실패: ${draftSave.error}`
                      : lastSavedAt
                        ? `임시저장됨 · ${new Date(lastSavedAt).toLocaleTimeString("ko-KR")}`
                        : "작성 내용은 이 브라우저에 임시저장됩니다."}
              </p>
              <div className="flex gap-2">
                <button
                  className="app-secondary-button min-h-11 text-sm disabled:cursor-not-allowed disabled:text-[#b0b8c1]"
                  disabled={currentStep === 0}
                  onClick={() => moveStep(currentStep - 1)}
                  type="button"
                >
                  이전
                </button>
                <button
                  className="app-primary-button min-h-11 text-sm"
                  disabled={currentStep === moduStartupSteps.length - 1}
                  onClick={() => moveStep(currentStep + 1)}
                  type="button"
                >
                  {nextStepLabels[currentStep]}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="app-surface p-5 sm:p-6" onBlurCapture={draftSave.saveNow}>
          <div className="no-print flex flex-col gap-3 border-b border-[#e5e8eb] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#3182f6]">생성 결과 수정</p>
              <h2 className="mt-1 text-xl font-bold text-[#191f28]">신청서 초안</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="app-secondary-button min-h-11 text-sm disabled:cursor-not-allowed disabled:text-[#b0b8c1]"
                disabled={!draft}
                onClick={copyDraft}
                type="button"
              >
                전체 복사
              </button>
              <button
                className="app-secondary-button min-h-11 text-sm disabled:cursor-not-allowed disabled:text-[#b0b8c1]"
                disabled={!draft}
                onClick={() => window.print()}
                type="button"
              >
                바로 인쇄
              </button>
              <button
                className="app-primary-button min-h-11 text-sm"
                disabled={!draft || submitting || !hasParticipantContext}
                onClick={submitDraft}
                type="button"
              >
                {submitting ? "제출 중..." : !hasParticipantContext ? "참여자 입장 후 제출 가능" : submittedSubmission ? "다시 제출" : "운영 시스템에 제출"}
              </button>
            </div>
          </div>

          {!draft ? (
            <div className="mt-6 rounded-lg border border-dashed border-[#d1d6db] bg-[#f7f8fa] p-8 text-center sm:p-12">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f3ff] text-lg font-bold text-[#3182f6]">AI</span>
              <p className="mt-3 text-lg font-bold text-[#191f28]">아직 생성된 초안이 없어요</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7684]">
                입력 단계를 마치고 AI 초안을 만들면 이곳에서 문장을 직접 수정할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">{input.programName || "프로그램명 미입력"}</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-950">{input.ideaTitle || input.ideaOneLine || "아이디어명 미입력"}</h3>
                <p className="mt-2 text-sm text-gray-700">
                  {input.teamName || "팀명 미입력"} · {input.participantName || "참가자명 미입력"} · {new Date().toLocaleDateString("ko-KR")}
                </p>
              </div>

              {draftTextFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-900">{field.label}</span>
                  <span className="mb-2 block text-xs text-gray-500">{field.help}</span>
                  <textarea
                    className="app-input h-auto py-3 text-sm leading-6"
                    rows={field.rows}
                    value={draft[field.key]}
                    onChange={(event) => updateDraftText(field.key, event.target.value)}
                  />
                </label>
              ))}

              {draftArrayFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-900">{field.label}</span>
                  <span className="mb-2 block text-xs text-gray-500">{field.help}</span>
                  <textarea
                    className="app-input h-auto py-3 text-sm leading-6"
                    rows={field.rows}
                    value={draft[field.key].join("\n")}
                    onChange={(event) => updateDraftArray(field.key, event.target.value)}
                  />
                </label>
              ))}

              <details className="no-print rounded-md border border-gray-200 bg-gray-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-gray-800">복사용 텍스트 미리보기</summary>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 text-xs leading-5 text-gray-700">
                  {printableText}
                </pre>
              </details>
            </div>
          )}
        </section>
      </div>

      <section className="app-surface no-print mt-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#191f28]">좋은 초안을 만드는 기준</h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-[#4e5968] md:grid-cols-3">
          <p className="rounded-lg bg-[#f7f8fa] p-4"><strong className="block text-[#191f28]">한 줄로 선명하게</strong>무엇을 누구에게 어떻게 제공하는지 바로 이해되게 씁니다.</p>
          <p className="rounded-lg bg-[#f7f8fa] p-4"><strong className="block text-[#191f28]">경험과 숫자로 구체적으로</strong>Q2~Q4에는 직접 경험, 좁은 고객, 객관 증거를 우선 배치합니다.</p>
          <p className="rounded-lg bg-[#f7f8fa] p-4"><strong className="block text-[#191f28]">변화로 마무리</strong>개인 성과보다 고객, 지역, 사회에 남길 변화를 보여줍니다.</p>
        </div>
      </section>

      {resetRequested ? (
        <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
          <section
            aria-describedby="reset-description"
            aria-labelledby="reset-title"
            aria-modal="true"
            className="app-surface w-full max-w-md p-5 shadow-xl sm:p-6"
            role="dialog"
          >
            <p className="text-sm font-bold text-red-600">작성 내용 초기화</p>
            <h2 className="mt-1 text-xl font-bold text-[#191f28]" id="reset-title">새로 작성할까요?</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b7684]" id="reset-description">
              현재 입력한 내용과 생성된 초안, 이 브라우저의 임시 저장이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button className="app-secondary-button w-full text-sm" onClick={() => setResetRequested(false)} type="button">
                계속 작성
              </button>
              <button className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" onClick={performReset} type="button">
                삭제하고 새로 작성
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
