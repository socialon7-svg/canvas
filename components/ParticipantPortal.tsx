"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  FeedbackStatus,
  HighViewOperationsState,
  HighViewParticipant,
  LeanCanvasSubmission,
  ParticipantModuleProgressStatus,
  StartupModule
} from "@/lib/types";
import {
  clearBrowserTemporaryDrafts,
  getBrowserTemporaryStorageSummary,
  getSubmission,
  saveModuStartupPrefill,
  saveParticipantPrefill,
  type BrowserTemporaryStorageSummary
} from "@/lib/storage";
import { getParticipantVisibleModules } from "@/lib/startupModules";
import { normalizeAccessCode, validateAccessCodeInput } from "@/lib/normalize";
import {
  clearParticipantSession,
  mergeParticipantEntryIntoOperationsState,
  readParticipantSession,
  writeParticipantSession
} from "@/lib/participantSession";
import {
  defaultOperationsState,
  findFeedback,
  loadOperationsState,
  saveOperationsState,
  toModuStartupInput,
  toParticipantInput
} from "@/lib/operationsStorage";

type ParticipantTab = "home" | "profile" | "write" | "feedback";

interface ParticipantJoinResponse {
  program?: HighViewOperationsState["programs"][number];
  participant?: HighViewParticipant;
  team?: HighViewOperationsState["teams"][number] | null;
  feedbacks?: HighViewOperationsState["feedbacks"];
  code?: string;
  error?: string;
}

const moduleStatusLabels: Record<ParticipantModuleProgressStatus, string> = {
  not_started: "시작 전",
  in_progress: "진행 중",
  completed: "완료",
  needs_review: "검토 필요"
};

const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  needs_revision: "수정 필요",
  good: "양호",
  excellent: "우수"
};

function moduleStatusClass(status: ParticipantModuleProgressStatus) {
  if (status === "completed") return "border-green-200 bg-green-50 text-green-800";
  if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

function feedbackStatusClass(status: FeedbackStatus) {
  if (status === "excellent") return "border-green-200 bg-green-50 text-green-800";
  if (status === "good") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function ParticipantPortal() {
  const router = useRouter();
  const [state, setState] = useState<HighViewOperationsState>(() => defaultOperationsState());
  const [programId, setProgramId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [tab, setTab] = useState<ParticipantTab>("home");
  const [programCode, setProgramCode] = useState("");
  const [participantCode, setParticipantCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [joining, setJoining] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState<LeanCanvasSubmission | null>(null);
  const [temporaryStorage, setTemporaryStorage] = useState<BrowserTemporaryStorageSummary>({
    draftCount: 0,
    fallbackSubmissionCount: 0,
    sessionPrefillCount: 0
  });

  useEffect(() => {
    const loaded = loadOperationsState();
    const session = readParticipantSession();
    setState(loaded);
    setProgramId(session.programId);
    setParticipantId(session.participantId);
    setTemporaryStorage(getBrowserTemporaryStorageSummary());
  }, []);

  const program = state.programs.find((item) => item.id === programId);
  const participant = state.participants.find((item) => item.id === participantId);
  const team = state.teams.find((item) => item.id === participant?.teamId);
  const feedback = findFeedback(state, participant?.latestSubmissionId);
  const latestPdfStatus = latestSubmission?.pdfStatus ?? "idle";
  const latestPdfLabel =
    latestPdfStatus === "success"
      ? "PDF 정상"
      : latestPdfStatus === "failed"
        ? "PDF 오류"
        : latestPdfStatus === "generating"
          ? "PDF 생성 중"
          : "PDF 대기";
  const latestPdfClassName =
    latestPdfStatus === "success"
      ? "font-bold text-green-700"
      : latestPdfStatus === "failed"
        ? "font-bold text-red-700"
        : latestPdfStatus === "generating"
          ? "font-bold text-amber-700"
          : "font-bold text-gray-700";
  const latestPdfButtonLabel =
    latestPdfStatus === "failed" ? "PDF 다시 생성" : latestPdfStatus === "success" ? "PDF 다운로드" : "PDF 생성하기";
  const latestSubmissionCode = latestSubmission?.id.slice(0, 8).toUpperCase();
  const hasProfile = Boolean(participant?.name?.trim());
  const hasLeanCanvasSubmission = Boolean(participant?.latestSubmissionId || latestSubmission);
  const hasModuStartupSubmission = Boolean(participant?.latestModuStartupSubmissionId || participant?.moduStartupSubmittedAt);
  const hasAnySubmission = hasLeanCanvasSubmission || hasModuStartupSubmission;
  const hasBrowserTemporaryStorage =
    temporaryStorage.draftCount > 0 ||
    temporaryStorage.sessionPrefillCount > 0 ||
    temporaryStorage.fallbackSubmissionCount > 0;
  const visibleModules = getParticipantVisibleModules(program);
  const getModuleProgressStatus = (module: StartupModule): ParticipantModuleProgressStatus => {
    if (module.slug === "lean-canvas" && hasLeanCanvasSubmission) return "completed";
    if (module.slug === "modu-startup-application" && hasModuStartupSubmission) return "completed";
    return participant?.moduleProgress?.[module.slug]?.status || "not_started";
  };
  const completedModuleCount = visibleModules.filter((module) => getModuleProgressStatus(module) === "completed").length;
  const moduleProgressPercent = visibleModules.length ? Math.round((completedModuleCount / visibleModules.length) * 100) : 0;
  const nextIncompleteModule = visibleModules.find((module) => getModuleProgressStatus(module) !== "completed");
  const studentProgressSteps = [
    { label: "입장", done: Boolean(program && participant), hint: "코드 확인" },
    { label: "내 정보", done: hasProfile, hint: "이름/소속" },
    {
      label: "모듈 진행",
      done: visibleModules.length > 0 && completedModuleCount === visibleModules.length,
      hint: `${completedModuleCount}/${visibleModules.length || 0}개`
    },
    {
      label: "제출 확인",
      done: hasAnySubmission,
      hint: hasAnySubmission ? "접수 완료" : "제출 전"
    }
  ];
  const studentCompletedSteps = studentProgressSteps.filter((step) => step.done).length;
  const studentProgressPercent = Math.round((studentCompletedSteps / studentProgressSteps.length) * 100);
  const statusCards = [
    {
      label: "제출 상태",
      value: hasAnySubmission ? "접수 완료" : "제출 전",
      hint: latestSubmissionCode ? `제출번호 ${latestSubmissionCode}` : "최종 제출 후 번호가 표시됩니다.",
      className: hasAnySubmission ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"
    },
    {
      label: "PDF 상태",
      value: !hasAnySubmission ? "대기" : latestPdfLabel,
      hint:
        latestPdfStatus === "failed"
          ? "미리보기에서 다시 생성하세요."
          : latestPdfStatus === "success"
            ? "제출물 열람에서 다운로드할 수 있습니다."
            : "PDF 버튼을 눌러 생성하면 상태가 정상으로 바뀝니다.",
      className:
        !hasAnySubmission
          ? "border-gray-200 bg-gray-50 text-gray-700"
          : latestPdfStatus === "success"
            ? "border-blue-200 bg-blue-50 text-blue-900"
            : latestPdfStatus === "failed"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
    },
    {
      label: "피드백",
      value: feedback ? "도착" : hasAnySubmission ? "검토 대기" : "제출 후 표시",
      hint: feedback?.nextAction || (hasAnySubmission ? "운영진 검토가 끝나면 표시됩니다." : "제출 후 운영진이 확인합니다."),
      className: feedback ? "border-green-200 bg-green-50 text-green-900" : "border-gray-200 bg-gray-50 text-gray-700"
    }
  ];
  const nextAction = (() => {
    if (!hasProfile) {
      return {
        title: "내 정보를 먼저 확인해주세요",
        description: "이름, 연락처, 소속이 맞아야 운영진이 제출 현황을 정확히 확인할 수 있습니다.",
        action: "내 정보 확인",
        onClick: () => setTab("profile")
      };
    }
    if (nextIncompleteModule) {
      return {
        title: `${nextIncompleteModule.title}이 남았습니다`,
        description: "운영진이 배정한 모듈만 순서대로 표시됩니다. 시작 전인 모듈부터 차례로 진행하세요.",
        action: "모듈 목록 보기",
        onClick: () => setTab("write")
      };
    }
    if (feedback) {
      return {
        title: "피드백이 도착했습니다",
        description: "운영진 코멘트와 다음 행동을 확인하고 필요하면 다시 보완해주세요.",
        action: "피드백 보기",
        onClick: () => setTab("feedback")
      };
    }
    if (hasAnySubmission) {
      return {
        title: "제출이 접수되었습니다",
        description: "운영진 확인 대기 중입니다. 제출물은 언제든 다시 열람할 수 있습니다.",
        action: "제출물 확인",
        onClick: () => (latestSubmission ? router.push(`/preview/${latestSubmission.id}`) : setTab("home"))
      };
    }
    return {
      title: "배정된 모듈을 모두 확인했습니다",
      description: "최종 제출이 필요한 모듈이 있다면 제출물 열람 또는 모듈 목록에서 제출 상태를 다시 확인해주세요.",
      action: "모듈 목록 보기",
      onClick: () => setTab("write")
    };
  })();

  useEffect(() => {
    let cancelled = false;

    async function loadLatestSubmission() {
      if (!participant?.latestSubmissionId) {
        setLatestSubmission(null);
        return;
      }

      const local = getSubmission(participant.latestSubmissionId);
      if (local) {
        setLatestSubmission(local);
        return;
      }

      try {
        const response = await fetch(`/api/submissions/${participant.latestSubmissionId}`);
        const data = (await response.json()) as { submission?: LeanCanvasSubmission };
        if (!cancelled) setLatestSubmission(response.ok && data.submission ? data.submission : null);
      } catch {
        if (!cancelled) setLatestSubmission(null);
      }
    }

    loadLatestSubmission();
    return () => {
      cancelled = true;
    };
  }, [participant?.latestSubmissionId]);

  useEffect(() => {
    if (!participant?.id || participant.id.startsWith("participant_")) return;

    fetch(`/api/participants/${participant.id}/last-seen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joined: false })
    }).catch(() => null);
  }, [participant?.id]);

  const persistState = (nextState: HighViewOperationsState) => {
    saveOperationsState(nextState);
    setState({ ...nextState });
  };

  const enterLocalParticipant = (submittedProgramCode: string, submittedParticipantCode: string) => {
    const matchedProgram = state.programs.find(
      (item) => normalizeAccessCode(item.programCode) === submittedProgramCode
    );
    const matchedParticipant = state.participants.find(
      (item) =>
        item.programId === matchedProgram?.id &&
        normalizeAccessCode(item.code) === submittedParticipantCode
    );

    if (!matchedProgram || !matchedParticipant) return false;

    const now = new Date().toISOString();
    const nextState: HighViewOperationsState = {
      ...state,
      participants: state.participants.map((item) =>
        item.id === matchedParticipant.id
          ? { ...item, joinedAt: item.joinedAt || now, lastSeenAt: now }
          : item
      )
    };
    persistState(nextState);
    writeParticipantSession(matchedProgram.id, matchedParticipant.id);
    setProgramId(matchedProgram.id);
    setParticipantId(matchedParticipant.id);
    setError("");
    setNotice("데모 모드로 입장했습니다. 이 브라우저의 임시 데이터를 사용합니다.");
    return true;
  };

  const joinParticipant = async (submittedProgramCode: string, submittedParticipantCode: string) => {
    setJoining(true);
    setError("");
    try {
      const response = await fetch("/api/participants/join", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programCode: submittedProgramCode,
          participantCode: submittedParticipantCode
        })
      });
      const data = (await response.json()) as ParticipantJoinResponse;

      if (response.ok && data.program && data.participant) {
        const nextState = mergeParticipantEntryIntoOperationsState({
          program: data.program,
          participant: data.participant,
          team: data.team || null,
          feedbacks: data.feedbacks
        });
        setState(nextState);
        setProgramId(data.program.id);
        setParticipantId(data.participant.id);
        setError("");
        setNotice("입장했습니다. 내 정보를 확인한 뒤 배정된 모듈을 진행하세요.");
        return;
      }
      const canUseDemoFallback =
        response.status === 503 &&
        (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY");
      if (!canUseDemoFallback) {
        setError(data.error || "입장에 실패했습니다. 코드를 확인하거나 운영진에게 문의해주세요.");
        return;
      }
      if (!enterLocalParticipant(submittedProgramCode, submittedParticipantCode)) {
        setError("데모 입장 정보를 찾을 수 없습니다. 프로그램 코드와 참여자 코드를 다시 확인해주세요.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해주세요.");
    } finally {
      setJoining(false);
    }
  };

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validation = validateAccessCodeInput({
      programCode: String(formData.get("programCode") || programCode),
      participantCode: String(formData.get("participantCode") || participantCode)
    });
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    await joinParticipant(validation.value.programCode, validation.value.participantCode);
  };

  const enterDemo = async () => {
    const demoProgramCode = "HV-DEMO";
    const demoParticipantCode = "P-DEMO1";
    setProgramCode(demoProgramCode);
    setParticipantCode(demoParticipantCode);
    await joinParticipant(demoProgramCode, demoParticipantCode);
  };

  const copyEntryError = async () => {
    const message = `참여자 입장 오류: ${error} (프로그램 ${programCode || "미입력"}, 참여자 ${participantCode || "미입력"})`;
    try {
      await navigator.clipboard.writeText(message);
      setNotice("운영진에게 전달할 오류 내용을 복사했습니다.");
    } catch {
      setNotice(message);
    }
  };

  const logout = () => {
    void fetch("/api/participants/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
    clearParticipantSession();
    setProgramId("");
    setParticipantId("");
    setProgramCode("");
    setParticipantCode("");
    setTab("home");
    setNotice("");
  };

  const clearTemporaryDrafts = () => {
    const clearedCount = clearBrowserTemporaryDrafts();
    setTemporaryStorage(getBrowserTemporaryStorageSummary());
    setNotice(
      clearedCount > 0
        ? `이 브라우저에 남아 있던 임시 작성 데이터 ${clearedCount}개를 삭제했습니다. 제출 완료 기록은 유지했습니다.`
        : "삭제할 브라우저 임시 작성 데이터가 없습니다."
    );
  };

  const updateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participant) return;
    const formData = new FormData(event.currentTarget);
    const updates = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      school: String(formData.get("school") || "").trim(),
      major: String(formData.get("major") || "").trim(),
      role: String(formData.get("role") || "").trim(),
      lastSeenAt: new Date().toISOString()
    } satisfies Partial<HighViewParticipant>;

    if (!participant.id.startsWith("participant_")) {
      try {
        const response = await fetch(`/api/participants/${participant.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        const data = (await response.json()) as { participant?: HighViewParticipant; code?: string; error?: string };
        const canUseDemoFallback =
          response.status === 503 &&
          (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY");
        if (response.ok && data.participant) {
          setState((current) => ({
            ...current,
            participants: current.participants.map((item) =>
              item.id === participant.id ? { ...item, ...updates, ...data.participant } : item
            )
          }));
          setNotice("내 정보를 운영 서버에 저장했습니다.");
          return;
        }
        if (!canUseDemoFallback) {
          setNotice(data.error || "내 정보를 저장하지 못했습니다. 다시 시도해주세요.");
          return;
        }
      } catch {
        setNotice("서버에 연결할 수 없어 저장하지 못했습니다. 네트워크를 확인해주세요.");
        return;
      }
    }

    const nextState: HighViewOperationsState = {
      ...state,
      participants: state.participants.map((item) =>
        item.id === participant.id ? { ...item, ...updates } : item
      )
    };
    persistState(nextState);
    setNotice("데모 모드로 이 브라우저에 내 정보를 임시 저장했습니다.");
  };

  const startCanvas = () => {
    if (!program || !participant) return;
    saveParticipantPrefill(toParticipantInput(program, participant, team));
    router.push("/participant/canvas");
  };

  const startModuStartup = () => {
    if (!program || !participant) return;
    saveModuStartupPrefill(toModuStartupInput(program, participant, team));
    router.push("/modu-startup");
  };

  const openModule = (module: StartupModule) => {
    if (module.slug === "lean-canvas") {
      startCanvas();
      return;
    }
    if (module.slug === "modu-startup-application") {
      startModuStartup();
      return;
    }
    router.push(module.route);
  };

  const copyFeedback = async () => {
    if (!feedback) return;
    const text = [
      `[피드백 상태] ${feedbackStatusLabels[feedback.status]}`,
      `[코멘트] ${feedback.comment || "-"}`,
      `[다음 액션] ${feedback.nextAction || "-"}`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("피드백과 다음 액션을 클립보드에 복사했습니다.");
    } catch {
      setNotice(text);
    }
  };

  if (!program || !participant) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">참여자 포털</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">참여자 입장</h1>
          <p className="mt-2 text-sm text-gray-600">
            내부직원이 발급한 프로그램 코드와 참여자 코드를 입력하세요.
          </p>
          <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
            공백, 하이픈, 대소문자는 자동으로 보정됩니다. 입장이 안 되면 화면의 코드와 안내받은 코드를 다시 비교하세요.
          </p>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">프로그램 코드</span>
              <input
                name="programCode"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="예: HV-DEMO"
                value={programCode}
                onChange={(event) => setProgramCode(normalizeAccessCode(event.target.value))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">참여자 코드</span>
              <input
                name="participantCode"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="예: P-DEMO1"
                value={participantCode}
                onChange={(event) => setParticipantCode(normalizeAccessCode(event.target.value))}
              />
            </label>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <p className="font-semibold">{error}</p>
                <p className="mt-1">공백과 소문자는 자동으로 보정됩니다. 예: HV-DEMO / P-DEMO1</p>
                <button className="mt-2 font-bold underline" onClick={copyEntryError} type="button">
                  운영진 전달용 오류 복사
                </button>
              </div>
            ) : null}
            <button
              className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900 disabled:bg-gray-400"
              disabled={joining}
              type="submit"
            >
              {joining ? "입장 확인 중..." : "입장하기"}
            </button>
          </form>
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <p className="mb-1 font-bold">데모 체험하기</p>
            <p>
              프로그램 코드: <code className="rounded bg-blue-100 px-1 py-0.5 font-mono font-bold">HV-DEMO</code>
            </p>
            <p>
              참여자 코드: <code className="rounded bg-blue-100 px-1 py-0.5 font-mono font-bold">P-DEMO1</code>
            </p>
            <button
              className="mt-3 w-full rounded-md border border-blue-300 bg-white px-3 py-2 font-bold text-blue-800 hover:bg-blue-100"
              disabled={joining}
              onClick={enterDemo}
              type="button"
            >
              {joining ? "입장 확인 중..." : "데모로 바로 입장"}
            </button>
          </div>
          <Link className="mt-4 inline-block text-sm font-semibold text-gray-500 hover:text-gray-700" href="/">
            역할 선택으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const tabs: Array<{ key: ParticipantTab; label: string }> = [
    { key: "home", label: "홈" },
    { key: "profile", label: "내 정보" },
    { key: "write", label: "모듈" },
    { key: "feedback", label: "피드백" }
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">참여자 워크스페이스 · {program.programCode}</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">{program.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {participant.name || participant.code} · {team?.name || "미배정"} · {program.clientName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                tab === item.key ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-800"
              }`}
              onClick={() => setTab(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={logout}>
            나가기
          </button>
        </div>
      </header>

      {notice ? (
        <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</p>
      ) : null}

      <section className="mb-5 rounded-lg border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-700">내가 해야 할 일</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">{studentProgressPercent}% 완료</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {studentCompletedSteps}/{studentProgressSteps.length}단계 완료 · {nextAction.title}
            </p>
          </div>
          <button
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900"
            onClick={nextAction.onClick}
            type="button"
          >
            {nextAction.action}
          </button>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${studentProgressPercent}%` }} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {studentProgressSteps.map((step) => (
            <div
              key={step.label}
              className={`rounded-md border px-3 py-2 text-sm ${
                step.done ? "border-green-200 bg-green-50 text-green-800" : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              <p className="font-bold">{step.done ? "완료" : "대기"} · {step.label}</p>
              <p className="mt-1 text-xs opacity-80">{step.hint}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {statusCards.map((card) => (
            <div key={card.label} className={`rounded-md border px-4 py-3 ${card.className}`}>
              <p className="text-xs font-bold opacity-80">{card.label}</p>
              <strong className="mt-1 block text-lg">{card.value}</strong>
              <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-80">{card.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
          {nextAction.description}
        </p>
      </section>

      {hasBrowserTemporaryStorage ? (
        <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">이 브라우저에 임시 저장 데이터가 있습니다</p>
              <p className="mt-1 leading-6">
                작성 중 초안 {temporaryStorage.draftCount}개
                {temporaryStorage.sessionPrefillCount ? `, 화면 이동용 임시 정보 ${temporaryStorage.sessionPrefillCount}개` : ""}
                {temporaryStorage.fallbackSubmissionCount
                  ? `, 서버 미연결 상태에서 저장된 제출 기록 ${temporaryStorage.fallbackSubmissionCount}건`
                  : ""}
                이 감지되었습니다. 공용 PC라면 수업 종료 후 임시 작성 데이터를 삭제하세요.
              </p>
            </div>
            <button
              className="shrink-0 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-100"
              onClick={clearTemporaryDrafts}
              type="button"
            >
              임시 작성 데이터 삭제
            </button>
          </div>
          {temporaryStorage.fallbackSubmissionCount ? (
            <p className="mt-2 text-xs leading-5 text-amber-800">
              제출 완료 기록은 운영 확인을 위해 자동 삭제하지 않습니다. 서버 저장 전 데모/오프라인 기록을 지워야 하면 운영진에게 확인하세요.
            </p>
          ) : null}
        </section>
      ) : null}

      {tab === "home" ? (
        <main className="grid gap-4 md:grid-cols-3">
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm md:col-span-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">오늘의 모듈</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">
                  {nextIncompleteModule ? nextIncompleteModule.title : "배정된 모듈을 모두 확인했습니다"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {nextIncompleteModule
                    ? nextIncompleteModule.description
                    : "운영진이 추가 모듈을 열면 이곳에 다음 과제가 표시됩니다."}
                </p>
              </div>
              <button
                className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900"
                onClick={() => (nextIncompleteModule ? openModule(nextIncompleteModule) : setTab("write"))}
                type="button"
              >
                {nextIncompleteModule ? "시작하기" : "모듈 목록 보기"}
              </button>
            </div>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:col-span-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500">배정된 창업교육 모듈</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">
                  {completedModuleCount}/{visibleModules.length}개 완료
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  관리자 설정에 따라 필요한 모듈만 표시됩니다. 숨겨진 모듈은 교육생 화면에 나타나지 않습니다.
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-700" style={{ width: `${moduleProgressPercent}%` }} />
                </div>
                <button
                  className="mt-3 w-full rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800"
                  onClick={() => setTab("write")}
                  type="button"
                >
                  전체 모듈 보기
                </button>
              </div>
            </div>
            {visibleModules.length ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {visibleModules.slice(0, 6).map((module) => {
                  const moduleStatus = getModuleProgressStatus(module);
                  return (
                    <button
                      key={module.id}
                      className="rounded-md border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                      onClick={() => openModule(module)}
                      type="button"
                    >
                      <span className="text-xs font-bold text-blue-700">{module.order}. {moduleStatusLabels[moduleStatus]}</span>
                      <span className="mt-1 block font-bold text-gray-950">{module.title}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                아직 배정된 모듈이 없습니다. 운영진에게 프로그램 설정을 확인해주세요.
              </p>
            )}
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:col-span-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500">내 배정 확인</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">{participant.name || participant.code}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  아래 정보가 다르면 과제 작성 전에 운영진에게 알려주세요.
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[520px]">
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">프로그램</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{program.name}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">팀</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{team?.name || "미배정"}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">참여자 코드</dt>
                  <dd className="mt-1 font-mono font-semibold text-gray-950">{participant.code}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">소속</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{participant.school || "미입력"}</dd>
                </div>
              </dl>
            </div>
          </section>
          {latestSubmission ? (
            <section className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm md:col-span-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-700">제출 완료 확인</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {latestSubmission.participant.ideaName || "린캔버스 제출물"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-green-900">
                    운영진 제출 목록에 접수된 상태입니다. 제출번호 {latestSubmissionCode}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold">제출 시간</span>
                      <br />
                      {new Date(latestSubmission.createdAt).toLocaleString("ko-KR")}
                    </p>
                    <p>
                      <span className="font-semibold">PDF 상태</span>
                      <br />
                      <span className={latestPdfClassName}>
                        {latestPdfLabel}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">피드백</span>
                      <br />
                      {feedback ? "도착" : "대기 중"}
                    </p>
                  </div>
                </div>
                <button
                  className="w-full rounded-md bg-green-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-800 sm:w-auto"
                  onClick={() => router.push(`/preview/${latestSubmission.id}`)}
                  type="button"
                >
                  제출물 열람
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm md:col-span-3">
              <p className="text-sm font-semibold text-amber-800">아직 제출 전입니다</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                최종 제출이 완료되면 이 자리에 제출 시간, PDF 상태, 제출물 열람 버튼이 표시됩니다.
              </p>
            </section>
          )}
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">내 상태</p>
            <strong className="mt-2 block text-2xl text-gray-950">{participant.name ? "등록" : "미등록"}</strong>
            <p className="mt-2 text-sm text-gray-600">내 정보를 먼저 저장하면 결과보고서 품질이 좋아집니다.</p>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">팀</p>
            <strong className="mt-2 block text-2xl text-gray-950">{team?.name || "미배정"}</strong>
            <p className="mt-2 text-sm text-gray-600">{team?.memo || "내부직원이 팀을 배정합니다."}</p>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">제출</p>
            <strong className="mt-2 block text-2xl text-gray-950">{participant.latestSubmissionId ? "완료" : "대기"}</strong>
            <p className="mt-2 text-sm text-gray-600">피드백: {feedback ? "도착" : "대기 중"}</p>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:col-span-3">
            <h2 className="text-lg font-bold text-gray-950">사용 순서</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              내 정보 확인 → 배정 모듈 수행 → 최종 제출 확인 → 피드백 확인 → 필요하면 다시 보완
            </p>
          </section>
        </main>
      ) : null}

      {tab === "profile" ? (
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={updateProfile}>
          <h2 className="text-lg font-bold text-gray-950">참여자 정보</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">이름</span>
              <input name="name" defaultValue={participant.name} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">이메일</span>
              <input name="email" defaultValue={participant.email} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">연락처</span>
              <input name="phone" defaultValue={participant.phone} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">소속/학교</span>
              <input name="school" defaultValue={participant.school} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">학과/부서</span>
              <input name="major" defaultValue={participant.major} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">팀 내 역할</span>
              <input name="role" defaultValue={participant.role} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="rounded-md bg-blue-700 px-5 py-2 text-sm font-bold text-white" type="submit">
              저장하기
            </button>
          </div>
        </form>
      ) : null}

      {tab === "write" ? (
        <main className="grid gap-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">나에게 배정된 모듈</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">{program.name}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  운영진이 선택한 모듈만 표시됩니다. 순서대로 진행하고, 준비 중 모듈은 임시 메모와 상태만 저장할 수 있습니다.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">
                {completedModuleCount}/{visibleModules.length}개 완료
              </span>
            </div>
          </section>
          {visibleModules.length ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleModules.map((module) => {
                const moduleStatus = getModuleProgressStatus(module);
                return (
                  <article key={module.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-blue-700">STEP {module.order}</p>
                        <h2 className="mt-1 text-lg font-bold text-gray-950">{module.title}</h2>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${moduleStatusClass(moduleStatus)}`}>
                        {moduleStatusLabels[moduleStatus]}
                      </span>
                    </div>
                    <p className="mt-3 min-h-12 text-sm leading-6 text-gray-600">{module.description}</p>
                    <button
                      className="mt-5 w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900"
                      onClick={() => openModule(module)}
                      type="button"
                    >
                      {moduleStatus === "not_started" ? "시작하기" : "이어하기"}
                    </button>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
              아직 이 프로그램에 배정된 교육생용 모듈이 없습니다. 운영진에게 프로그램 모듈 설정을 확인해주세요.
            </section>
          )}
        </main>
      ) : null}

      {tab === "feedback" ? (
        <main className="grid gap-4">
          <section
            className={`rounded-lg border p-5 shadow-sm ${
              feedback
                ? feedback.status === "needs_revision"
                  ? "border-amber-200 bg-amber-50"
                  : "border-green-200 bg-green-50"
                : latestSubmission
                  ? "border-blue-200 bg-blue-50"
                  : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">피드백 상태</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">
                  {feedback ? feedbackStatusLabels[feedback.status] : latestSubmission ? "운영진 검토 대기" : "제출 전"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {feedback
                    ? "운영진 코멘트와 다음 액션을 확인하고 필요한 부분만 보완하세요."
                    : latestSubmission
                      ? "제출물은 접수되었습니다. 운영진 검토가 끝나면 이 탭에 코멘트가 표시됩니다."
                      : "아직 연결된 제출물이 없습니다. 먼저 배정된 모듈을 작성하고 최종 제출을 완료하세요."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {latestSubmission ? (
                  <>
                    <button
                      className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white"
                      onClick={() => router.push(`/preview/${latestSubmission.id}`)}
                      type="button"
                    >
                      제출물 열람
                    </button>
                    <button
                      className={`rounded-md border px-4 py-2 text-sm font-bold ${
                        latestPdfStatus === "failed"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : latestPdfStatus === "success"
                            ? "border-blue-200 bg-white text-blue-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                      onClick={() => router.push(`/preview/${latestSubmission.id}?download=1`)}
                      type="button"
                    >
                      {latestPdfButtonLabel}
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white"
                    onClick={() => setTab("write")}
                    type="button"
                  >
                    모듈 작성하기
                  </button>
                )}
                {feedback ? (
                  <button
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800"
                    onClick={copyFeedback}
                    type="button"
                  >
                    피드백 복사
                  </button>
                ) : null}
              </div>
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-950">내 제출물</h2>
              {latestSubmission ? (
                <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">아이디어</p>
                    <p className="mt-1 font-bold text-gray-950">{latestSubmission.participant.ideaName || "아이디어명 없음"}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">제출 시간</p>
                    <p className="mt-1 font-bold text-gray-950">{new Date(latestSubmission.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">PDF</p>
                    <p className={`mt-1 ${latestPdfClassName}`}>
                      {latestPdfLabel}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  최종 제출이 완료되면 이곳에 제출 시간과 PDF 상태가 표시됩니다.
                </p>
              )}
            </article>
            <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-950">다음 행동</h2>
              <ol className="mt-3 space-y-3 text-sm text-gray-700">
                <li className="rounded-md bg-gray-50 p-3">
                  <span className="font-bold text-gray-950">1. 제출물 확인</span>
                  <p className="mt-1">내가 낸 내용과 PDF 상태를 먼저 확인합니다.</p>
                </li>
                <li className="rounded-md bg-gray-50 p-3">
                  <span className="font-bold text-gray-950">2. 코멘트 반영</span>
                  <p className="mt-1">수정 필요가 표시되면 모듈 탭에서 보완합니다.</p>
                </li>
                <li className="rounded-md bg-gray-50 p-3">
                  <span className="font-bold text-gray-950">3. 운영진 확인</span>
                  <p className="mt-1">모호한 내용은 현장 운영진에게 바로 질문하세요.</p>
                </li>
              </ol>
              {feedback?.status === "needs_revision" ? (
                <button
                  className="mt-4 w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white"
                  onClick={() => setTab("write")}
                  type="button"
                >
                  보완하러 가기
                </button>
              ) : null}
            </aside>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">운영진 피드백</p>
                <h2 className="mt-1 text-lg font-bold text-gray-950">코멘트와 다음 액션</h2>
              </div>
              {feedback ? (
                <span className={`rounded-full border px-3 py-1 text-sm font-bold ${feedbackStatusClass(feedback.status)}`}>
                  {feedbackStatusLabels[feedback.status]}
                </span>
              ) : null}
            </div>
            {feedback ? (
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="font-bold text-gray-900">코멘트</p>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-gray-700">{feedback.comment || "-"}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="font-bold text-gray-900">다음 액션</p>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-gray-700">{feedback.nextAction || "-"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-gray-50 px-3 py-3 text-sm leading-6 text-gray-600">
                아직 피드백이 없습니다. 운영진 검토가 끝나면 이곳에 코멘트와 다음 액션이 표시됩니다.
              </p>
            )}
          </section>
        </main>
      ) : null}
    </div>
  );
}
