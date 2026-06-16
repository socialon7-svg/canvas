"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StartupModuleSelector from "@/components/StartupModuleSelector";
import StatusBadge from "@/components/StatusBadge";
import type {
  FeedbackStatus,
  HighViewOperationsState,
  LeanCanvasSubmission,
  ParticipantModuleProgressStatus,
  ProgramStatus
} from "@/lib/types";
import { deleteSubmission, loadSubmissions } from "@/lib/storage";
import {
  DEFAULT_STARTUP_MODULE_IDS,
  getProgramModuleIds,
  getProgramModules,
  normalizeStartupModuleIds
} from "@/lib/startupModules";
import {
  getFeedbackProgressStatus,
  getParticipantStatus,
  getPdfStatus,
  getSubmissionStatus
} from "@/lib/status";
import {
  createParticipant,
  createProgram,
  createTeam,
  defaultOperationsState,
  exportOperationsState,
  findFeedback,
  getProgramStats,
  loadOperationsState,
  resetOperationsState,
  saveFeedback,
  saveOperationsState
} from "@/lib/operationsStorage";

type InternalTab = "dashboard" | "programs" | "participants" | "teams" | "submissions" | "moduleReviews" | "report";
type SubmissionFilter = "all" | "notEntered" | "submitted" | "notSubmitted" | "feedbackPending" | "feedbackDone" | "pdfFailed";
type ModuleReviewFilter = "needsReview" | "inProgress" | "completed" | "all";
type UiTone = "gray" | "blue" | "green" | "amber" | "red";

type FocusInfo = {
  title: string;
  description: string;
  tone: Exclude<UiTone, "gray">;
  actionLabel: string;
  filter?: SubmissionFilter;
};

const submissionFilterLabels: Record<SubmissionFilter, string> = {
  all: "전체",
  notEntered: "미입장",
  submitted: "제출 완료",
  notSubmitted: "미제출",
  feedbackPending: "피드백 대기",
  feedbackDone: "피드백 완료",
  pdfFailed: "PDF 오류"
};

const moduleReviewFilterLabels: Record<ModuleReviewFilter, string> = {
  needsReview: "검토 필요",
  inProgress: "진행 중",
  completed: "완료",
  all: "전체"
};

const moduleProgressStatusLabels: Record<ParticipantModuleProgressStatus, string> = {
  not_started: "시작 전",
  in_progress: "진행 중",
  completed: "완료",
  needs_review: "검토 필요"
};

const ADMIN_SESSION_KEY = "highviewlab-internal-authorized";
const ADMIN_PASSWORD_KEY = "highviewlab-internal-password";

function readSessionValue(key: string) {
  try {
    return window.sessionStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeSessionValue(key: string, value: string) {
  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    // Session storage can be blocked in embedded browser contexts.
  }
}

function removeSessionValue(key: string) {
  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

async function loadServerSubmissions(adminPassword: string) {
  const response = await fetch("/api/submissions", {
    headers: { "x-admin-password": adminPassword }
  });
  const data = (await response.json()) as {
    submissions?: LeanCanvasSubmission[];
    code?: string;
    error?: string;
  };

  if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
    return { submissions: loadSubmissions(), fallback: true };
  }

  if (!response.ok || !data.submissions) {
    throw new Error(data.error || "제출 목록을 불러오지 못했습니다.");
  }

  return { submissions: data.submissions, fallback: false };
}

function MetricCard({
  label,
  value,
  hint,
  tone = "gray"
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: UiTone;
}) {
  const toneClasses: Record<UiTone, string> = {
    gray: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50"
  };

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <strong className="mt-2 block text-3xl text-gray-950">{value}</strong>
      <p className="mt-2 text-sm text-gray-600">{hint}</p>
    </section>
  );
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InternalPortal() {
  const [state, setState] = useState<HighViewOperationsState>(() => defaultOperationsState());
  const [currentProgramId, setCurrentProgramId] = useState("");
  const [tab, setTab] = useState<InternalTab>("dashboard");
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<LeanCanvasSubmission[]>([]);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>("all");
  const [moduleReviewFilter, setModuleReviewFilter] = useState<ModuleReviewFilter>("needsReview");
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [newProgramModuleIds, setNewProgramModuleIds] = useState<number[]>(DEFAULT_STARTUP_MODULE_IDS);
  const [currentProgramModuleDraftIds, setCurrentProgramModuleDraftIds] = useState<number[]>(DEFAULT_STARTUP_MODULE_IDS);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loaded = loadOperationsState();
    setState(loaded);
    setCurrentProgramId(loaded.programs[0]?.id || "");

    const storedPassword = readSessionValue(ADMIN_PASSWORD_KEY);
    const storedAuth = readSessionValue(ADMIN_SESSION_KEY) === "true";
    if (!storedAuth || !storedPassword) return;

    setAuthorized(true);
    setRefreshing(true);
    loadServerSubmissions(storedPassword)
      .then((result) => {
        setSubmissions(result.submissions);
        setFallbackMode(result.fallback);
        if (result.fallback) setNotice("Supabase 대신 이 브라우저의 임시 제출 목록을 표시합니다.");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "제출 목록을 불러오지 못했습니다."))
      .finally(() => setRefreshing(false));
  }, []);

  const currentProgram = state.programs.find((program) => program.id === currentProgramId) || state.programs[0];
  const currentProgramModuleIds = useMemo(() => getProgramModuleIds(currentProgram), [currentProgram]);
  const currentProgramModules = useMemo(() => getProgramModules(currentProgram), [currentProgram]);
  const currentProgramVisibleModules = useMemo(
    () => currentProgramModules.filter((module) => !module.isAdminOnly && module.status !== "disabled"),
    [currentProgramModules]
  );
  const currentParticipantVisibleModuleCount = currentProgramVisibleModules.length;

  useEffect(() => {
    if (!currentProgram) return;
    setCurrentProgramModuleDraftIds(getProgramModuleIds(currentProgram));
  }, [currentProgram, currentProgramModuleIds]);

  const programTeams = useMemo(
    () => (currentProgram ? state.teams.filter((team) => team.programId === currentProgram.id) : []),
    [state, currentProgram]
  );
  const programParticipants = useMemo(
    () =>
      currentProgram ? state.participants.filter((participant) => participant.programId === currentProgram.id) : [],
    [state, currentProgram]
  );
  const selectedParticipantForEdit =
    programParticipants.find((participant) => participant.id === selectedParticipantId) || programParticipants[0];
  const programSubmissions = useMemo(
    () =>
      currentProgram
        ? submissions.filter(
            (submission) =>
              submission.participant.operation?.programId === currentProgram.id ||
              submission.participant.educationName === currentProgram.name
          )
        : [],
    [currentProgram, submissions]
  );
  const stats = currentProgram ? getProgramStats(state, currentProgram.id, submissions) : null;
  const overallStats = useMemo(() => {
    const submittedParticipantIds = new Set(
      submissions
        .map((submission) => submission.participant.operation?.participantId)
        .filter((participantId): participantId is string => Boolean(participantId))
    );
    state.participants.forEach((participant) => {
      if (participant.latestSubmissionId) submittedParticipantIds.add(participant.id);
    });

    return {
      programs: state.programs.length,
      activePrograms: state.programs.filter((program) => program.status === "active").length,
      participants: state.participants.length,
      submitted: submittedParticipantIds.size,
      missing: Math.max(state.participants.length - submittedParticipantIds.size, 0),
      feedbacks: state.feedbacks.length
    };
  }, [state, submissions]);
  const programOverview = useMemo(
    () =>
      state.programs.map((program) => ({
        program,
        stats: getProgramStats(state, program.id, submissions)
      })),
    [state, submissions]
  );
  const programStatusRows = useMemo(
    () =>
      programParticipants.map((participant) => {
        const submission = programSubmissions.find(
          (item) =>
            item.id === participant.latestSubmissionId ||
            item.participant.operation?.participantId === participant.id ||
            item.participant.participantName === participant.name
        );
        const feedback = submission ? findFeedback(state, submission.id) : undefined;
        const participantStatus = getParticipantStatus(participant, submission);
        const submissionStatus = getSubmissionStatus(submission);
        const feedbackStatus = getFeedbackProgressStatus(feedback);
        const pdfStatus = getPdfStatus(submission);

        return {
          participant,
          submission,
          feedback,
          participantStatus,
          submissionStatus,
          feedbackStatus,
          pdfStatus
        };
      }),
    [programParticipants, programSubmissions, state]
  );
  const operationalMetrics = useMemo(
    () => ({
      totalParticipants: programStatusRows.length,
      entered: programStatusRows.filter((row) => row.participantStatus !== "invited").length,
      notEntered: programStatusRows.filter((row) => row.participantStatus === "invited").length,
      submitted: programStatusRows.filter((row) => row.submission).length,
      notSubmitted: programStatusRows.filter((row) => !row.submission).length,
      feedbackPending: programStatusRows.filter((row) => row.submission && row.feedbackStatus !== "published").length,
      feedbackDone: programStatusRows.filter((row) => row.feedbackStatus === "published").length,
      pdfSuccess: programStatusRows.filter((row) => row.pdfStatus === "success").length,
      pdfFailed: programStatusRows.filter((row) => row.pdfStatus === "failed").length
    }),
    [programStatusRows]
  );
  const moduleProgressRows = useMemo(
    () =>
      programParticipants.map((participant) => {
        const statuses = currentProgramVisibleModules.map(
          (module) => participant.moduleProgress?.[module.slug]?.status || "not_started"
        );
        const completed = statuses.filter((status) => status === "completed").length;
        const inProgress = statuses.filter((status) => status === "in_progress").length;
        const needsReview = statuses.filter((status) => status === "needs_review").length;
        const total = statuses.length;

        return {
          participant,
          completed,
          inProgress,
          needsReview,
          notStarted: Math.max(total - completed - inProgress - needsReview, 0),
          total,
          completionRate: total ? Math.round((completed / total) * 100) : 0
        };
      }),
    [currentProgramVisibleModules, programParticipants]
  );
  const moduleProgressMetrics = useMemo(() => {
    const totalTasks = moduleProgressRows.reduce((sum, row) => sum + row.total, 0);
    const completedTasks = moduleProgressRows.reduce((sum, row) => sum + row.completed, 0);
    const inProgressTasks = moduleProgressRows.reduce((sum, row) => sum + row.inProgress, 0);
    const needsReviewTasks = moduleProgressRows.reduce((sum, row) => sum + row.needsReview, 0);
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      needsReviewTasks,
      notStartedTasks: Math.max(totalTasks - completedTasks - inProgressTasks - needsReviewTasks, 0),
      completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [moduleProgressRows]);
  const moduleReviewRows = useMemo(
    () =>
      programParticipants.flatMap((participant) => {
        const team = programTeams.find((item) => item.id === participant.teamId);
        return currentProgramVisibleModules
          .map((module) => {
            const progress = participant.moduleProgress?.[module.slug];
            const status = progress?.status || "not_started";
            return {
              participant,
              team,
              module,
              progress,
              status
            };
          })
          .filter((row) => row.status !== "not_started" || row.progress?.inputData || row.progress?.outputData);
      }),
    [currentProgramVisibleModules, programParticipants, programTeams]
  );
  const moduleReviewCounts = useMemo<Record<ModuleReviewFilter, number>>(
    () => ({
      needsReview: moduleReviewRows.filter((row) => row.status === "needs_review").length,
      inProgress: moduleReviewRows.filter((row) => row.status === "in_progress").length,
      completed: moduleReviewRows.filter((row) => row.status === "completed").length,
      all: moduleReviewRows.length
    }),
    [moduleReviewRows]
  );
  const filteredModuleReviewRows = useMemo(() => {
    if (moduleReviewFilter === "all") return moduleReviewRows;
    if (moduleReviewFilter === "needsReview") {
      return moduleReviewRows.filter((row) => row.status === "needs_review");
    }
    if (moduleReviewFilter === "inProgress") {
      return moduleReviewRows.filter((row) => row.status === "in_progress");
    }
    return moduleReviewRows.filter((row) => row.status === "completed");
  }, [moduleReviewFilter, moduleReviewRows]);
  const entryRate = operationalMetrics.totalParticipants
    ? Math.round((operationalMetrics.entered / operationalMetrics.totalParticipants) * 100)
    : 0;
  const submissionRate = operationalMetrics.totalParticipants
    ? Math.round((operationalMetrics.submitted / operationalMetrics.totalParticipants) * 100)
    : 0;
  const feedbackRate = operationalMetrics.submitted
    ? Math.round((operationalMetrics.feedbackDone / operationalMetrics.submitted) * 100)
    : 0;
  const pdfIssueRate = operationalMetrics.submitted
    ? Math.round((operationalMetrics.pdfFailed / operationalMetrics.submitted) * 100)
    : 0;
  const dashboardProgressItems = [
    {
      label: "입장률",
      value: entryRate,
      detail: `${operationalMetrics.entered}/${operationalMetrics.totalParticipants}명 입장`,
      tone: "blue" as UiTone
    },
    {
      label: "제출률",
      value: submissionRate,
      detail: `${operationalMetrics.submitted}/${operationalMetrics.totalParticipants}명 제출`,
      tone: operationalMetrics.notSubmitted > 0 ? ("amber" as UiTone) : ("green" as UiTone)
    },
    {
      label: "피드백 완료율",
      value: feedbackRate,
      detail: `${operationalMetrics.feedbackDone}/${operationalMetrics.submitted}건 완료`,
      tone: operationalMetrics.feedbackPending > 0 ? ("blue" as UiTone) : ("green" as UiTone)
    },
    {
      label: "PDF 오류율",
      value: pdfIssueRate,
      detail: `${operationalMetrics.pdfFailed}/${operationalMetrics.submitted}건 오류`,
      tone: operationalMetrics.pdfFailed > 0 ? ("red" as UiTone) : ("green" as UiTone)
    }
  ];
  const actionQueue = [
    {
      label: "미입장",
      count: operationalMetrics.notEntered,
      description: "참여자 코드 안내가 필요한 대상",
      filter: "notEntered" as SubmissionFilter,
      tone: "gray" as UiTone
    },
    {
      label: "미제출",
      count: operationalMetrics.notSubmitted,
      description: "마감 전 제출 독려가 필요한 대상",
      filter: "notSubmitted" as SubmissionFilter,
      tone: "amber" as UiTone
    },
    {
      label: "피드백 대기",
      count: operationalMetrics.feedbackPending,
      description: "제출은 되었고 코멘트가 필요한 건",
      filter: "feedbackPending" as SubmissionFilter,
      tone: "blue" as UiTone
    },
    {
      label: "PDF 오류",
      count: operationalMetrics.pdfFailed,
      description: "인쇄 전 복구 확인이 필요한 건",
      filter: "pdfFailed" as SubmissionFilter,
      tone: "red" as UiTone
    }
  ];
  const filterCounts = useMemo<Record<SubmissionFilter, number>>(
    () => ({
      all: programStatusRows.length,
      notEntered: programStatusRows.filter((row) => row.participantStatus === "invited").length,
      submitted: programStatusRows.filter((row) => row.submission).length,
      notSubmitted: programStatusRows.filter((row) => !row.submission).length,
      feedbackPending: programStatusRows.filter((row) => row.submission && row.feedbackStatus !== "published").length,
      feedbackDone: programStatusRows.filter((row) => row.feedbackStatus === "published").length,
      pdfFailed: programStatusRows.filter((row) => row.pdfStatus === "failed").length
    }),
    [programStatusRows]
  );
  const filteredStatusRows = useMemo(() => {
    switch (submissionFilter) {
      case "notEntered":
        return programStatusRows.filter((row) => row.participantStatus === "invited");
      case "submitted":
        return programStatusRows.filter((row) => row.submission);
      case "notSubmitted":
        return programStatusRows.filter((row) => !row.submission);
      case "feedbackPending":
        return programStatusRows.filter((row) => row.submission && row.feedbackStatus !== "published");
      case "feedbackDone":
        return programStatusRows.filter((row) => row.feedbackStatus === "published");
      case "pdfFailed":
        return programStatusRows.filter((row) => row.pdfStatus === "failed");
      default:
        return programStatusRows;
    }
  }, [programStatusRows, submissionFilter]);
  const selectedStatusRow =
    filteredStatusRows.find((row) => row.participant.id === selectedParticipantId) || filteredStatusRows[0];
  const activeSubmissionFilterLabel = submissionFilterLabels[submissionFilter];
  const moduleReportRows = useMemo(
    () =>
      currentProgramVisibleModules.map((module) => {
        const rows = programParticipants.map((participant) => participant.moduleProgress?.[module.slug]);
        const completed = rows.filter((progress) => progress?.status === "completed").length;
        const inProgress = rows.filter((progress) => progress?.status === "in_progress").length;
        const needsReview = rows.filter((progress) => progress?.status === "needs_review").length;
        const outputCount = rows.filter((progress) => Boolean(progress?.outputData?.trim())).length;
        return {
          module,
          assigned: programParticipants.length,
          completed,
          inProgress,
          needsReview,
          outputCount,
          completionRate: programParticipants.length ? Math.round((completed / programParticipants.length) * 100) : 0
        };
      }),
    [currentProgramVisibleModules, programParticipants]
  );
  const moduleReportHighlights = useMemo(
    () =>
      moduleReviewRows
        .filter((row) => row.progress?.outputData?.trim() || row.progress?.adminComment?.trim())
        .sort((a, b) => {
          const left = a.status === "completed" ? 0 : a.status === "needs_review" ? 1 : 2;
          const right = b.status === "completed" ? 0 : b.status === "needs_review" ? 1 : 2;
          return left - right || a.module.order - b.module.order;
        })
        .slice(0, 8),
    [moduleReviewRows]
  );
  const reportSummary = useMemo(() => {
    if (!currentProgram) return "";
    return `${currentProgram.name} 운영 현황: 참여자 ${operationalMetrics.totalParticipants}명 중 ${operationalMetrics.entered}명이 입장했고, ${operationalMetrics.submitted}명이 린캔버스를 제출했습니다. 배정 모듈은 ${currentParticipantVisibleModuleCount}개이며 전체 모듈 완료율은 ${moduleProgressMetrics.completionRate}%입니다. 모듈 검토 필요 ${moduleReviewCounts.needsReview}건, 피드백 대기 ${operationalMetrics.feedbackPending}건, PDF 오류 ${operationalMetrics.pdfFailed}건입니다.`;
  }, [
    currentParticipantVisibleModuleCount,
    currentProgram,
    moduleProgressMetrics.completionRate,
    moduleReviewCounts.needsReview,
    operationalMetrics
  ]);
  const reportPackText = useMemo(() => {
    if (!currentProgram) return reportSummary;
    const moduleLines = moduleReportRows
      .slice(0, 10)
      .map(
        (row) =>
          `- ${row.module.order}. ${row.module.title}: 완료 ${row.completed}/${row.assigned}명, 결과메모 ${row.outputCount}건, 검토필요 ${row.needsReview}건`
      );
    const highlightLines = moduleReportHighlights.slice(0, 5).map((row) => {
      const memo = row.progress?.outputData?.trim() || row.progress?.adminComment?.trim() || "";
      return `- ${row.participant.name || row.participant.code} / ${row.module.title}: ${memo.slice(0, 120)}`;
    });
    return [
      reportSummary,
      "",
      "[모듈 수행 요약]",
      ...(moduleLines.length ? moduleLines : ["- 아직 모듈 수행 기록이 없습니다."]),
      "",
      "[대표 결과 메모]",
      ...(highlightLines.length ? highlightLines : ["- 아직 대표 결과 메모가 없습니다."])
    ].join("\n");
  }, [currentProgram, moduleReportHighlights, moduleReportRows, reportSummary]);
  const moduleReportOutputCount = moduleReportRows.reduce((sum, row) => sum + row.outputCount, 0);
  const operationsFocus: FocusInfo =
    moduleReviewCounts.needsReview > 0
      ? {
          title: `모듈 검토 필요 ${moduleReviewCounts.needsReview}건`,
          description: "교육생이 검토 요청한 모듈을 확인하고 상태와 코멘트를 저장하세요.",
          tone: "amber",
          actionLabel: "모듈 검토 열기"
        }
      : operationalMetrics.pdfFailed > 0
      ? {
          title: `PDF 오류 ${operationalMetrics.pdfFailed}건`,
          description: "인쇄 전 PDF 오류 제출물을 먼저 열어 복구 여부를 확인하세요.",
          tone: "red",
          actionLabel: "PDF 오류만 보기",
          filter: "pdfFailed"
        }
      : operationalMetrics.notSubmitted > 0
        ? {
            title: `미제출 ${operationalMetrics.notSubmitted}명`,
            description: "미제출자 목록 복사로 현장 안내 메시지를 빠르게 준비할 수 있습니다.",
            tone: "amber",
            actionLabel: "미제출자 보기",
            filter: "notSubmitted"
          }
        : operationalMetrics.feedbackPending > 0
          ? {
              title: `피드백 대기 ${operationalMetrics.feedbackPending}건`,
              description: "제출은 완료됐고 운영진 코멘트만 남은 상태입니다.",
              tone: "blue",
              actionLabel: "피드백 대기 보기",
              filter: "feedbackPending"
            }
          : {
              title: "운영 상태가 안정적입니다",
              description: "제출과 피드백 흐름이 정상적으로 정리되고 있습니다.",
              tone: "green",
              actionLabel: "결과보고 보기"
            };

  const persistState = (nextState: HighViewOperationsState) => {
    saveOperationsState(nextState);
    setState({ ...nextState });
  };

  const refreshSubmissions = async (adminPassword = readSessionValue(ADMIN_PASSWORD_KEY)) => {
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const result = await loadServerSubmissions(adminPassword);
      setSubmissions(result.submissions);
      setFallbackMode(result.fallback);
      if (result.fallback) setNotice("Supabase 대신 이 브라우저의 임시 제출 목록을 표시합니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 목록을 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  const downloadParticipantsCsv = () => {
    if (!currentProgram) return;
    const rows = [
      ["프로그램", "프로그램코드", "참여자코드", "이름", "이메일", "연락처", "소속", "역할", "팀", "접속여부", "제출여부"],
      ...programParticipants.map((participant) => {
        const assignedTeam = programTeams.find((team) => team.id === participant.teamId);
        return [
          currentProgram.name,
          currentProgram.programCode,
          participant.code,
          participant.name,
          participant.email,
          participant.phone,
          participant.school,
          participant.role,
          assignedTeam?.name || "",
          participant.joinedAt ? "접속" : "초대",
          participant.latestSubmissionId ? "완료" : "대기"
        ];
      })
    ];
    downloadCsv(`${currentProgram.programCode}-participants.csv`, rows);
  };

  const downloadSubmissionsCsv = () => {
    if (!currentProgram) return;
    const rows = [
      ["프로그램", "팀", "참가자", "참여자코드", "입장상태", "제출상태", "아이디어", "제출일", "피드백상태", "PDF상태", "멘토코멘트", "다음액션"],
      ...programStatusRows.map((row) => {
        return [
          currentProgram.name,
          row.submission?.participant.teamName || programTeams.find((team) => team.id === row.participant.teamId)?.name || "",
          row.participant.name || row.submission?.participant.participantName || "",
          row.participant.code,
          row.participantStatus,
          row.submissionStatus,
          row.submission?.participant.ideaName || "",
          row.submission ? new Date(row.submission.createdAt).toLocaleString("ko-KR") : "",
          row.feedbackStatus,
          row.pdfStatus,
          row.feedback?.comment || "",
          row.feedback?.nextAction || ""
        ];
      })
    ];
    downloadCsv(`${currentProgram.programCode}-submissions.csv`, rows);
  };

  const downloadModuleProgressCsv = () => {
    if (!currentProgram) return;
    const rows = [
      [
        "프로그램",
        "프로그램코드",
        "참여자코드",
        "참여자",
        "팀",
        "모듈번호",
        "모듈명",
        "상태",
        "입력메모",
        "결과메모",
        "운영진코멘트",
        "검토시각",
        "업데이트"
      ],
      ...programParticipants.flatMap((participant) => {
        const team = programTeams.find((item) => item.id === participant.teamId);
        return currentProgramVisibleModules.map((module) => {
          const progress = participant.moduleProgress?.[module.slug];
          return [
            currentProgram.name,
            currentProgram.programCode,
            participant.code,
            participant.name || "",
            team?.name || "",
            module.order,
            module.title,
            progress?.status || "not_started",
            progress?.inputData || "",
            progress?.outputData || "",
            progress?.adminComment || "",
            progress?.reviewedAt ? new Date(progress.reviewedAt).toLocaleString("ko-KR") : "",
            progress?.updatedAt ? new Date(progress.updatedAt).toLocaleString("ko-KR") : ""
          ];
        });
      })
    ];
    downloadCsv(`${currentProgram.programCode}-module-progress.csv`, rows);
  };

  const downloadReportCsv = () => {
    const rows = [
      [
        "프로그램",
        "프로그램코드",
        "기관",
        "팀",
        "참가자",
        "참여자코드",
        "입장상태",
        "제출상태",
        "아이디어",
        "한줄설명",
        "제출일",
        "피드백상태",
        "PDF상태",
        "멘토코멘트",
        "다음액션",
        "열람URL"
      ],
      ...submissions.map((submission) => {
        const program =
          state.programs.find((item) => item.id === submission.participant.operation?.programId) ||
          state.programs.find((item) => item.name === submission.participant.educationName);
        const participant = state.participants.find(
          (item) => item.id === submission.participant.operation?.participantId
        );
        const feedback = findFeedback(state, submission.id);
        const participantStatus = participant ? getParticipantStatus(participant, submission) : "submitted";
        const submissionStatus = getSubmissionStatus(submission);
        const feedbackStatus = getFeedbackProgressStatus(feedback);
        const pdfStatus = getPdfStatus(submission);
        const previewUrl =
          typeof window === "undefined" ? `/preview/${submission.id}` : `${window.location.origin}/preview/${submission.id}`;

        return [
          program?.name || submission.participant.educationName,
          program?.programCode || submission.participant.operation?.programCode || "",
          program?.clientName || "",
          submission.participant.teamName,
          submission.participant.participantName,
          participant?.code || submission.participant.operation?.participantCode || "",
          participantStatus,
          submissionStatus,
          submission.participant.ideaName,
          submission.participant.ideaSummary,
          new Date(submission.createdAt).toLocaleString("ko-KR"),
          feedbackStatus,
          pdfStatus,
          feedback?.comment || "",
          feedback?.nextAction || "",
          previewUrl
        ];
      })
    ];
    downloadCsv(`highviewlab-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const copyUnsubmittedList = async () => {
    const lines = programStatusRows
      .filter((row) => !row.submission)
      .map((row) => {
        const team = programTeams.find((item) => item.id === row.participant.teamId);
        return `${team?.name || "미배정"} / ${row.participant.name || "미등록"} / ${row.participant.code}`;
      });
    const text = lines.length ? lines.join("\n") : "미제출자가 없습니다.";
    try {
      await navigator.clipboard.writeText(text);
      setNotice("미제출자 목록을 클립보드에 복사했습니다.");
    } catch {
      setNotice(text);
    }
  };

  const copyReportSummary = async () => {
    try {
      await navigator.clipboard.writeText(reportPackText);
      setNotice("결과보고 요약과 모듈 수행 메모를 클립보드에 복사했습니다.");
    } catch {
      setNotice(reportPackText);
    }
  };

  const openFilteredSubmissions = (filter: SubmissionFilter) => {
    setSubmissionFilter(filter);
    setTab("submissions");
  };

  const openFilteredModuleReviews = (filter: ModuleReviewFilter = "needsReview") => {
    setModuleReviewFilter(filter);
    setTab("moduleReviews");
  };

  const openFocusAction = () => {
    if (moduleReviewCounts.needsReview > 0) {
      openFilteredModuleReviews("needsReview");
      return;
    }
    if (operationsFocus.filter) {
      openFilteredSubmissions(operationsFocus.filter);
      return;
    }
    setTab("report");
  };

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) throw new Error("암호가 올바르지 않습니다.");

      writeSessionValue(ADMIN_SESSION_KEY, "true");
      writeSessionValue(ADMIN_PASSWORD_KEY, password);
      setAuthorized(true);
      setPassword("");
      await refreshSubmissions(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeSessionValue(ADMIN_SESSION_KEY);
    removeSessionValue(ADMIN_PASSWORD_KEY);
    setAuthorized(false);
    setSubmissions([]);
  };

  const addProgram = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const program = createProgram({
      name: String(formData.get("name") || "").trim(),
      clientName: String(formData.get("clientName") || "").trim(),
      startDate: String(formData.get("startDate") || "").trim(),
      endDate: String(formData.get("endDate") || "").trim(),
      brief: String(formData.get("brief") || "").trim(),
      moduleIds: newProgramModuleIds
    });
    if (!program.name || !program.clientName) {
      setError("프로그램명과 기관명은 필수입니다.");
      return;
    }
    const nextState = { ...state, programs: [program, ...state.programs] };
    persistState(nextState);
    setCurrentProgramId(program.id);
    setNotice("프로그램을 생성했습니다.");
    setNewProgramModuleIds(DEFAULT_STARTUP_MODULE_IDS);
    event.currentTarget.reset();
  };

  const saveCurrentProgramModules = () => {
    if (!currentProgram) return;
    const moduleIds = normalizeStartupModuleIds(currentProgramModuleDraftIds);
    const nextState = {
      ...state,
      programs: state.programs.map((program) =>
        program.id === currentProgram.id
          ? {
              ...program,
              moduleIds
            }
          : program
      )
    };
    persistState(nextState);
    setCurrentProgramModuleDraftIds(moduleIds);
    setNotice(`${currentProgram.name}의 노출 모듈 ${moduleIds.length}개를 저장했습니다.`);
  };

  const updateCurrentProgramInfo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const clientName = String(formData.get("clientName") || "").trim();
    if (!name || !clientName) {
      setError("프로그램명과 기관명은 비워둘 수 없습니다.");
      return;
    }
    const nextState = {
      ...state,
      programs: state.programs.map((program) =>
        program.id === currentProgram.id
          ? {
              ...program,
              name,
              clientName,
              startDate: String(formData.get("startDate") || "").trim() || program.startDate,
              endDate: String(formData.get("endDate") || "").trim() || program.endDate,
              brief: String(formData.get("brief") || "").trim(),
              status: String(formData.get("status") || program.status) as ProgramStatus
            }
          : program
      )
    };
    persistState(nextState);
    setError("");
    setNotice("프로그램 기본 정보를 저장했습니다.");
  };

  const addInvites = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const formData = new FormData(event.currentTarget);
    const count = Math.max(1, Math.min(100, Number(formData.get("count") || 1)));
    const school = String(formData.get("school") || "").trim();
    const invites = Array.from({ length: count }, () => createParticipant(currentProgram.id, school));
    persistState({ ...state, participants: [...invites, ...state.participants] });
    setNotice(`${count}개의 참여자 코드를 생성했습니다.`);
  };

  const updateParticipantInfo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedParticipantForEdit) return;
    const formData = new FormData(event.currentTarget);
    const nextState = {
      ...state,
      participants: state.participants.map((participant) =>
        participant.id === selectedParticipantForEdit.id
          ? {
              ...participant,
              name: String(formData.get("name") || "").trim(),
              email: String(formData.get("email") || "").trim(),
              phone: String(formData.get("phone") || "").trim(),
              school: String(formData.get("school") || "").trim(),
              major: String(formData.get("major") || "").trim(),
              role: String(formData.get("role") || "").trim(),
              teamId: String(formData.get("teamId") || "")
            }
          : participant
      )
    };
    persistState(nextState);
    setNotice("참여자 정보를 저장했습니다.");
  };

  const removeParticipant = (participantId: string) => {
    const participant = state.participants.find((item) => item.id === participantId);
    if (!participant) return;
    const label = participant.name || participant.code;
    if (!window.confirm(`${label} 참여자 코드를 삭제할까요?\n제출물 자체는 삭제되지 않지만 운영 목록에서는 사라집니다.`)) return;
    const nextState = {
      ...state,
      participants: state.participants.filter((item) => item.id !== participantId),
      feedbacks: state.feedbacks.filter((feedback) => feedback.participantId !== participantId)
    };
    persistState(nextState);
    if (selectedParticipantId === participantId) setSelectedParticipantId("");
    setNotice(`${label} 참여자 코드를 삭제했습니다.`);
  };

  const addTeam = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const memo = String(formData.get("memo") || "").trim();
    if (!name) {
      setError("팀명을 입력해주세요.");
      return;
    }
    const team = createTeam(currentProgram.id, name, memo);
    persistState({ ...state, teams: [team, ...state.teams] });
    setNotice("팀을 생성했습니다.");
    event.currentTarget.reset();
  };

  const updateTeam = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const teamId = form.dataset.teamId || "";
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const memo = String(formData.get("memo") || "").trim();
    if (!name) {
      setError("팀명을 입력해주세요.");
      return;
    }
    const nextState = {
      ...state,
      teams: state.teams.map((team) => (team.id === teamId ? { ...team, name, memo } : team))
    };
    persistState(nextState);
    setError("");
    setNotice("팀 정보를 저장했습니다.");
  };

  const removeTeam = (teamId: string) => {
    const team = state.teams.find((item) => item.id === teamId);
    if (!team) return;
    const memberCount = state.participants.filter((participant) => participant.teamId === teamId).length;
    const message =
      memberCount > 0
        ? `${team.name} 팀을 삭제할까요?\n소속 멤버 ${memberCount}명은 미배정 상태로 변경됩니다.`
        : `${team.name} 팀을 삭제할까요?`;
    if (!window.confirm(message)) return;
    const nextState = {
      ...state,
      teams: state.teams.filter((item) => item.id !== teamId),
      participants: state.participants.map((participant) =>
        participant.teamId === teamId ? { ...participant, teamId: "" } : participant
      )
    };
    persistState(nextState);
    setNotice(`${team.name} 팀을 삭제했습니다.`);
  };

  const assignTeam = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const participantId = String(formData.get("participantId") || "");
    const teamId = String(formData.get("teamId") || "");
    const participant = state.participants.find((item) => item.id === participantId);
    if (!participant) return;
    participant.teamId = teamId;
    persistState(state);
    setNotice("팀 배정을 저장했습니다.");
  };

  const handleReset = () => {
    if (!window.confirm("운영 데모 데이터를 초기화할까요? 제출물은 삭제되지 않습니다.")) return;
    const nextState = resetOperationsState();
    setState(nextState);
    setCurrentProgramId(nextState.programs[0]?.id || "");
    setNotice("운영 데모 데이터를 초기화했습니다.");
  };

  const handleFeedback = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const form = event.currentTarget;
    const submissionId = form.dataset.submissionId || "";
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) return;
    const formData = new FormData(form);
    saveFeedback(state, {
      programId: currentProgram.id,
      participantId: submission.participant.operation?.participantId || submission.id,
      submissionId,
      comment: String(formData.get("comment") || "").trim(),
      nextAction: String(formData.get("nextAction") || "").trim(),
      status: String(formData.get("status") || "needs_revision") as FeedbackStatus
    });
    persistState(state);
    setNotice("피드백을 저장했습니다.");
  };

  const handleModuleReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const participantId = form.dataset.participantId || "";
    const moduleSlug = form.dataset.moduleSlug || "";
    const participant = state.participants.find((item) => item.id === participantId);
    const startupModule = currentProgramVisibleModules.find((item) => item.slug === moduleSlug);
    if (!participant || !startupModule) return;
    const formData = new FormData(form);
    const now = new Date().toISOString();
    const currentProgress = participant.moduleProgress?.[startupModule.slug];
    const status = String(formData.get("status") || currentProgress?.status || "in_progress") as ParticipantModuleProgressStatus;
    const nextState = {
      ...state,
      participants: state.participants.map((item) =>
        item.id === participant.id
          ? {
              ...item,
              moduleProgress: {
                ...(item.moduleProgress || {}),
                [startupModule.slug]: {
                  moduleId: startupModule.id,
                  status,
                  inputData: currentProgress?.inputData || "",
                  outputData: currentProgress?.outputData || "",
                  adminComment: String(formData.get("adminComment") || "").trim(),
                  reviewedAt: now,
                  createdAt: currentProgress?.createdAt || now,
                  updatedAt: now
                }
              }
            }
          : item
      )
    };
    persistState(nextState);
    setNotice(`${participant.name || participant.code}의 ${startupModule.title} 검토 상태를 저장했습니다.`);
  };

  const removeSubmission = async (submission: LeanCanvasSubmission) => {
    if (!window.confirm(`${submission.participant.ideaName || "선택한 제출물"}을 삭제할까요?`)) return;
    const adminPassword = readSessionValue(ADMIN_PASSWORD_KEY);

    if (fallbackMode) {
      setSubmissions(deleteSubmission(submission.id));
      return;
    }

    const response = await fetch(`/api/submissions/${submission.id}/delete`, {
      method: "POST",
      headers: { "x-admin-password": adminPassword }
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      alert(data.error || "삭제에 실패했습니다.");
      return;
    }
    setSubmissions((current) => current.filter((item) => item.id !== submission.id));
  };

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">내부직원 포털</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">내부직원 로그인</h1>
          <p className="mt-2 text-sm text-gray-600">암호만 입력하면 운영 포털과 제출 목록을 관리할 수 있습니다.</p>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">암호</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                암호가 올바르지 않습니다.
              </p>
            ) : null}
            <button
              className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? "확인 중..." : "접속하기"}
            </button>
          </form>
          <Link className="mt-4 inline-block text-sm font-semibold text-gray-500 hover:text-gray-700" href="/">
            역할 선택으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const tabs: Array<{ key: InternalTab; label: string }> = [
    { key: "dashboard", label: "대시보드" },
    { key: "programs", label: "프로그램" },
    { key: "participants", label: "참여자" },
    { key: "teams", label: "팀" },
    { key: "submissions", label: "제출/피드백" },
    { key: "moduleReviews", label: "모듈검토" },
    { key: "report", label: "결과보고" }
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <header className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">내부직원 포털</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-950">하이뷰랩 프로그램 운영 포털</h1>
            <p className="mt-2 text-sm text-gray-600">프로그램, 참여자, 팀, 산출물 제출, 피드백, 결과보고를 한 흐름으로 관리합니다.</p>
            {currentProgram ? (
              <p className="mt-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                현재 프로그램: {currentProgram.name} · {currentProgram.programCode} · 교육생 노출 모듈{" "}
                {currentParticipantVisibleModuleCount}개
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 lg:min-w-[520px]">
            <label className="grid gap-1 text-sm font-semibold text-gray-800">
              프로그램 선택
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal"
                value={currentProgram?.id || ""}
                onChange={(event) => setCurrentProgramId(event.target.value)}
              >
                {state.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-400" onClick={() => refreshSubmissions()} disabled={refreshing}>
                {refreshing ? "새로고침 중..." : "제출 새로고침"}
              </button>
              <button className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800" onClick={() => setTab("submissions")} type="button">
                제출/피드백 보기
              </button>
              <button
                className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800"
                onClick={() => openFilteredModuleReviews("needsReview")}
                type="button"
              >
                모듈검토 {moduleReviewCounts.needsReview}
              </button>
              <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold" onClick={() => setTab("report")} type="button">
                결과보고
              </button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold" onClick={() => exportOperationsState(state)}>
                운영 데이터 백업
              </button>
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold" onClick={downloadParticipantsCsv}>
                참여자 CSV
              </button>
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold" onClick={downloadSubmissionsCsv}>
                제출 CSV
              </button>
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold" onClick={downloadModuleProgressCsv}>
                모듈 CSV
              </button>
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold" onClick={downloadReportCsv}>
                전체 결과 CSV
              </button>
              <Link className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800" href="/admin/modu-startup">
                모두의창업 목록
              </Link>
              <button className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700" onClick={handleReset}>
                데모 초기화
              </button>
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold" onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                tab === item.key ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-800"
              }`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</p> : null}

      {tab === "dashboard" && currentProgram && stats ? (
        <main className="grid gap-4">
          <section
            className={`rounded-lg border p-5 shadow-sm ${
              operationsFocus.tone === "red"
                ? "border-red-200 bg-red-50 text-red-900"
                : operationsFocus.tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : operationsFocus.tone === "blue"
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-green-200 bg-green-50 text-green-900"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold">지금 먼저 볼 일</p>
                <h2 className="mt-1 text-2xl font-bold">{operationsFocus.title}</h2>
                <p className="mt-2 text-sm leading-6">{operationsFocus.description}</p>
              </div>
              <button
                className="rounded-md border border-current/20 bg-white/70 px-4 py-2 text-sm font-bold transition-colors hover:bg-white"
                onClick={openFocusAction}
                type="button"
              >
                {operationsFocus.actionLabel}
              </button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dashboardProgressItems.map((item) => (
              <article key={item.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{item.label}</p>
                    <strong className="mt-1 block text-3xl text-gray-950">{item.value}%</strong>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.tone === "red"
                        ? "bg-red-100 text-red-700"
                        : item.tone === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : item.tone === "blue"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.detail}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      item.tone === "red"
                        ? "bg-red-600"
                        : item.tone === "amber"
                          ? "bg-amber-500"
                          : item.tone === "blue"
                            ? "bg-blue-600"
                            : "bg-green-600"
                    }`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">오늘 처리 큐</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">현장에서 바로 확인할 항목</h2>
              </div>
              <p className="text-sm text-gray-600">카드를 누르면 제출/피드백 목록이 해당 상태로 필터링됩니다.</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {actionQueue.map((item) => (
                <button
                  key={item.label}
                  className={`rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                    item.tone === "red"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : item.tone === "amber"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : item.tone === "blue"
                          ? "border-blue-200 bg-blue-50 text-blue-900"
                          : "border-gray-200 bg-gray-50 text-gray-800"
                  }`}
                  onClick={() => openFilteredSubmissions(item.filter)}
                  type="button"
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <strong className="mt-2 block text-3xl">{item.count}</strong>
                  <span className="mt-2 block text-sm leading-6">{item.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="현재 참여자" value={operationalMetrics.totalParticipants} hint="선택 프로그램 기준" />
            <MetricCard label="입장 완료" value={operationalMetrics.entered} hint={`미입장 ${operationalMetrics.notEntered}명`} tone={operationalMetrics.notEntered > 0 ? "amber" : "green"} />
            <MetricCard label="제출 완료" value={operationalMetrics.submitted} hint={`미제출 ${operationalMetrics.notSubmitted}명`} tone={operationalMetrics.notSubmitted > 0 ? "amber" : "green"} />
            <MetricCard label="피드백 대기" value={operationalMetrics.feedbackPending} hint={`완료 ${operationalMetrics.feedbackDone}건`} tone={operationalMetrics.feedbackPending > 0 ? "blue" : "green"} />
            <MetricCard label="PDF 완료" value={operationalMetrics.pdfSuccess} hint="생성 가능 상태" tone="green" />
            <MetricCard label="PDF 오류" value={operationalMetrics.pdfFailed} hint="복구 확인 필요" tone={operationalMetrics.pdfFailed > 0 ? "red" : "green"} />
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="모듈 완료율"
              value={moduleProgressMetrics.completionRate + "%"}
              hint={`${moduleProgressMetrics.completedTasks}/${moduleProgressMetrics.totalTasks}개 과제 완료`}
              tone={moduleProgressMetrics.completionRate >= 80 ? "green" : "amber"}
            />
            <MetricCard
              label="모듈 진행 중"
              value={moduleProgressMetrics.inProgressTasks}
              hint="교육생이 임시 저장한 모듈"
              tone={moduleProgressMetrics.inProgressTasks > 0 ? "blue" : "gray"}
            />
            <MetricCard
              label="검토 필요"
              value={moduleProgressMetrics.needsReviewTasks}
              hint="운영진 확인이 필요한 모듈"
              tone={moduleProgressMetrics.needsReviewTasks > 0 ? "amber" : "green"}
            />
            <MetricCard
              label="시작 전 모듈"
              value={moduleProgressMetrics.notStartedTasks}
              hint="아직 손대지 않은 배정 모듈"
              tone={moduleProgressMetrics.notStartedTasks > 0 ? "amber" : "green"}
            />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">교육생 노출 모듈</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">
                  {currentParticipantVisibleModuleCount}개 모듈이 교육생 화면에 표시됩니다
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  프로그램별 모듈 구성은 프로그램 탭에서 수정할 수 있습니다.
                </p>
              </div>
              <button
                className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800"
                onClick={() => setTab("programs")}
                type="button"
              >
                모듈 설정 수정
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {currentProgramModules.slice(0, 10).map((module) => (
                <span key={module.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {module.order}. {module.title}
                </span>
              ))}
              {currentProgramModules.length > 10 ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  +{currentProgramModules.length - 10}개
                </span>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-5">
            <MetricCard label="전체 프로그램" value={overallStats.programs} hint={`운영중 ${overallStats.activePrograms}개`} />
            <MetricCard label="전체 참여자" value={overallStats.participants} hint="발급된 참여자 코드" />
            <MetricCard label="전체 제출" value={overallStats.submitted} hint={`미제출 ${overallStats.missing}명`} tone={overallStats.missing > 0 ? "amber" : "green"} />
            <MetricCard label="전체 피드백" value={overallStats.feedbacks} hint="저장된 코멘트" />
            <MetricCard label="현재 제출률" value={stats.submitRate + "%"} hint={currentProgram.name} tone={stats.submitRate >= 80 ? "green" : "amber"} />
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            {programOverview.map(({ program, stats: programStats }) => (
              <article key={program.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">{program.programCode}</p>
                    <h2 className="mt-1 font-bold text-gray-950">{program.name}</h2>
                    <p className="mt-1 text-xs text-gray-500">{program.clientName}</p>
                  </div>
                  <button
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold"
                    onClick={() => setCurrentProgramId(program.id)}
                    type="button"
                  >
                    관리하기
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-md bg-gray-50 p-2">
                    <strong className="block text-base text-gray-950">{programStats.participants}</strong>
                    참여자
                  </div>
                  <div className="rounded-md bg-gray-50 p-2">
                    <strong className="block text-base text-gray-950">{programStats.teams}</strong>
                    팀
                  </div>
                  <div className="rounded-md bg-gray-50 p-2">
                    <strong className="block text-base text-gray-950">{programStats.submitRate}%</strong>
                    제출률
                  </div>
                  <div className="rounded-md bg-gray-50 p-2">
                    <strong className="block text-base text-gray-950">{programStats.feedbacks}</strong>
                    피드백
                  </div>
                </div>
              </article>
            ))}
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">{currentProgram.name}</h2>
            <p className="mt-2 text-sm text-gray-600">
              기관: {currentProgram.clientName} · 기간: {currentProgram.startDate} ~ {currentProgram.endDate} · 코드:{" "}
              <span className="font-bold">{currentProgram.programCode}</span>
            </p>
            <p className="mt-3 text-sm text-gray-700">{currentProgram.brief}</p>
          </section>
        </main>
      ) : null}

      {tab === "programs" ? (
        <main className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={addProgram}>
            <h2 className="text-lg font-bold text-gray-950">새 프로그램 생성</h2>
            <div className="mt-4 space-y-3">
              <input name="name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="프로그램명" />
              <input name="clientName" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="기관명" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="startDate" type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <input name="endDate" type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <textarea name="brief" className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="운영 메모" />
              <StartupModuleSelector
                description="새 프로그램을 만들 때 교육생에게 노출할 창업교육 모듈을 선택합니다."
                selectedModuleIds={newProgramModuleIds}
                title="새 프로그램 모듈 선택"
                onChange={setNewProgramModuleIds}
              />
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">생성하기</button>
            </div>
          </form>
          <div className="grid gap-4">
            {currentProgram ? (
              <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={updateCurrentProgramInfo}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700">현재 프로그램 기본 정보</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-950">{currentProgram.name}</h2>
                    <p className="mt-2 text-sm text-gray-600">교육명, 기관명, 기간, 운영 상태를 수정합니다.</p>
                  </div>
                  <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" type="submit">
                    기본 정보 저장
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-800">프로그램명</span>
                    <input
                      name="name"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={currentProgram.name}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-800">기관명</span>
                    <input
                      name="clientName"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={currentProgram.clientName}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-800">시작일</span>
                    <input
                      name="startDate"
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={currentProgram.startDate}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-800">종료일</span>
                    <input
                      name="endDate"
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={currentProgram.endDate}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-800">운영 상태</span>
                    <select
                      name="status"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={currentProgram.status}
                    >
                      <option value="active">운영중</option>
                      <option value="closed">종료</option>
                    </select>
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-gray-800">운영 메모</span>
                    <textarea
                      name="brief"
                      className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={currentProgram.brief}
                    />
                  </label>
                </div>
              </form>
            ) : null}
            {currentProgram ? (
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700">현재 프로그램 모듈 수정</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-950">{currentProgram.name}</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      저장하면 참여자 포털의 모듈 목록이 이 선택값 기준으로 즉시 바뀝니다.
                    </p>
                  </div>
                  <button
                    className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white"
                    onClick={saveCurrentProgramModules}
                    type="button"
                  >
                    선택 모듈 저장
                  </button>
                </div>
                <StartupModuleSelector
                  description="현재 선택된 프로그램에서 사용할 모듈만 남깁니다. 관리자용 모듈은 교육생에게 보이지 않습니다."
                  selectedModuleIds={currentProgramModuleDraftIds}
                  title="현재 프로그램 모듈 선택"
                  onChange={setCurrentProgramModuleDraftIds}
                />
              </section>
            ) : null}
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3">프로그램</th>
                    <th className="px-4 py-3">기관</th>
                    <th className="px-4 py-3">코드</th>
                    <th className="px-4 py-3">기간</th>
                    <th className="px-4 py-3">모듈</th>
                    <th className="px-4 py-3">선택</th>
                  </tr>
                </thead>
                <tbody>
                  {state.programs.map((program) => {
                    const moduleCount = getProgramModules(program).filter((module) => !module.isAdminOnly).length;
                    return (
                      <tr key={program.id} className="border-t border-gray-200">
                        <td className="px-4 py-3 font-semibold">{program.name}</td>
                        <td className="px-4 py-3">{program.clientName}</td>
                        <td className="px-4 py-3">{program.programCode}</td>
                        <td className="px-4 py-3">{program.startDate} ~ {program.endDate}</td>
                        <td className="px-4 py-3">{moduleCount}개 노출</td>
                        <td className="px-4 py-3">
                          <button
                            className="font-semibold text-blue-700 underline"
                            onClick={() => setCurrentProgramId(program.id)}
                            type="button"
                          >
                            선택
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>
        </main>
      ) : null}

      {tab === "participants" && currentProgram ? (
        <main className="grid gap-4">
          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-700">참여자에게 안내할 프로그램 코드</p>
              <strong className="mt-1 block font-mono text-2xl text-blue-950">{currentProgram.programCode}</strong>
            </div>
            <MetricCard label="발급 코드" value={programParticipants.length} hint="현재 프로그램 참여자" />
            <MetricCard label="입장 완료" value={operationalMetrics.entered} hint={`미입장 ${operationalMetrics.notEntered}명`} tone={operationalMetrics.notEntered > 0 ? "amber" : "green"} />
            <MetricCard label="제출 완료" value={operationalMetrics.submitted} hint={`미제출 ${operationalMetrics.notSubmitted}명`} tone={operationalMetrics.notSubmitted > 0 ? "amber" : "green"} />
          </section>
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:flex md:items-end md:gap-3" onSubmit={addInvites}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">생성 인원</span>
              <input name="count" type="number" min="1" max="100" defaultValue="5" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-3 block md:mt-0">
              <span className="mb-1 block text-sm font-semibold text-gray-800">기본 소속</span>
              <input name="school" className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="선택 입력" />
            </label>
            <button className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white md:mt-0">초대코드 생성</button>
            <p className="mt-3 text-sm text-gray-600 md:mt-0">프로그램 코드: <span className="font-bold">{currentProgram.programCode}</span></p>
          </form>
          {selectedParticipantForEdit ? (
            <form
              key={selectedParticipantForEdit.id}
              className="rounded-lg border border-blue-100 bg-blue-50/50 p-5 shadow-sm"
              onSubmit={updateParticipantInfo}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700">참여자 정보 수정</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {selectedParticipantForEdit.name || selectedParticipantForEdit.code}
                  </h2>
                  <p className="mt-2 text-sm text-blue-950">
                    참여자 코드 <span className="font-mono font-bold">{selectedParticipantForEdit.code}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" type="submit">
                    참여자 저장
                  </button>
                  <button
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700"
                    onClick={() => removeParticipant(selectedParticipantForEdit.id)}
                    type="button"
                  >
                    참여자 삭제
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label>
                  <span className="mb-1 block text-sm font-semibold text-gray-800">이름</span>
                  <input
                    name="name"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.name}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold text-gray-800">이메일</span>
                  <input
                    name="email"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.email}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold text-gray-800">연락처</span>
                  <input
                    name="phone"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.phone}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold text-gray-800">소속</span>
                  <input
                    name="school"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.school}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold text-gray-800">학과/부서</span>
                  <input
                    name="major"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.major}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-semibold text-gray-800">역할</span>
                  <input
                    name="role"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.role}
                  />
                </label>
                <label className="md:col-span-3">
                  <span className="mb-1 block text-sm font-semibold text-gray-800">팀</span>
                  <select
                    name="teamId"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedParticipantForEdit.teamId}
                  >
                    <option value="">미배정</option>
                    {programTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </form>
          ) : (
            <section className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
              아직 생성된 참여자 코드가 없습니다. 초대코드를 먼저 생성하세요.
            </section>
          )}
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">코드</th>
                  <th className="px-4 py-3">이름/이메일</th>
                  <th className="px-4 py-3">소속</th>
                  <th className="px-4 py-3">팀</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">제출</th>
                  <th className="px-4 py-3">모듈 진행</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {programParticipants.map((participant) => {
                  const team = programTeams.find((item) => item.id === participant.teamId);
                  const moduleRow = moduleProgressRows.find((row) => row.participant.id === participant.id);
                  return (
                    <tr key={participant.id} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-semibold">{participant.code}</td>
                      <td className="px-4 py-3">{participant.name || "미등록"}<br /><span className="text-xs text-gray-500">{participant.email}</span></td>
                      <td className="px-4 py-3">{participant.school || "-"}<br /><span className="text-xs text-gray-500">{participant.major}</span></td>
                      <td className="px-4 py-3">{team?.name || "미배정"}</td>
                      <td className="px-4 py-3">{participant.joinedAt ? "접속" : "초대됨"}</td>
                      <td className="px-4 py-3">{participant.latestSubmissionId ? "완료" : "대기"}</td>
                      <td className="px-4 py-3">
                        {moduleRow ? (
                          <div>
                            <p className="font-semibold text-gray-950">
                              {moduleRow.completed}/{moduleRow.total}개 완료
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              진행 {moduleRow.inProgress} · 검토 {moduleRow.needsReview} · 시작 전 {moduleRow.notStarted}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-800"
                          onClick={() => setSelectedParticipantId(participant.id)}
                          type="button"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </main>
      ) : null}

      {tab === "teams" ? (
        <main className="grid gap-4 lg:grid-cols-2">
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={addTeam}>
            <h2 className="text-lg font-bold text-gray-950">팀 생성</h2>
            <div className="mt-4 space-y-3">
              <input name="name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="팀명" />
              <textarea name="memo" className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="메모" />
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">팀 생성</button>
            </div>
          </form>
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={assignTeam}>
            <h2 className="text-lg font-bold text-gray-950">참여자 팀 배정</h2>
            <div className="mt-4 space-y-3">
              <select name="participantId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {programParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name || participant.code} / {participant.code}
                  </option>
                ))}
              </select>
              <select name="teamId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">미배정</option>
                {programTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">배정하기</button>
            </div>
          </form>
          <section className="grid gap-3 lg:col-span-2 md:grid-cols-2">
            {programTeams.map((team) => {
              const members = programParticipants.filter((participant) => participant.teamId === team.id);
              return (
                <form
                  key={team.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                  data-team-id={team.id}
                  onSubmit={updateTeam}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">팀 정보</p>
                      <h3 className="mt-1 font-bold text-gray-950">{team.name}</h3>
                    </div>
                    <button
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700"
                      onClick={() => removeTeam(team.id)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-gray-800">팀명</span>
                      <input
                        name="name"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        defaultValue={team.name}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-gray-800">메모</span>
                      <textarea
                        name="memo"
                        className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        defaultValue={team.memo}
                      />
                    </label>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">
                    멤버 {members.length}명: {members.map((member) => member.name || member.code).join(", ") || "없음"}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" type="submit">
                      팀 저장
                    </button>
                  </div>
                </form>
              );
            })}
          </section>
        </main>
      ) : null}

      {tab === "submissions" ? (
        <main className="grid gap-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-700">현재 필터</p>
                <strong className="mt-1 block text-xl text-blue-950">{activeSubmissionFilterLabel}</strong>
                <p className="mt-1 text-sm text-blue-900">{filteredStatusRows.length}건 표시 중</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-700">현장 안내 필요</p>
                <strong className="mt-1 block text-xl text-amber-950">{operationalMetrics.notSubmitted}명 미제출</strong>
                <p className="mt-1 text-sm text-amber-900">목록 복사 후 단체 안내에 활용하세요.</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-600">선택 상세</p>
                <strong className="mt-1 block text-xl text-gray-950">
                  {selectedStatusRow ? selectedStatusRow.participant.name || selectedStatusRow.participant.code : "선택 없음"}
                </strong>
                <p className="mt-1 text-sm text-gray-600">오른쪽 패널에서 제출물과 다음 액션을 확인합니다.</p>
              </div>
            </div>
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950">제출물 상태 필터</h2>
                <p className="mt-1 text-sm text-gray-600">미입장, 미제출, 피드백 대기, PDF 오류를 빠르게 좁혀 봅니다.</p>
              </div>
              <button
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-50"
                onClick={copyUnsubmittedList}
                type="button"
              >
                미제출자 목록 복사
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(submissionFilterLabels) as SubmissionFilter[]).map((filter) => (
                <button
                  key={filter}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    submissionFilter === filter ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-white text-gray-700"
                  }`}
                  onClick={() => setSubmissionFilter(filter)}
                  type="button"
                >
                  {submissionFilterLabels[filter]} {filterCounts[filter]}
                </button>
              ))}
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4">
              {filteredStatusRows.length === 0 ? (
                <section className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
                  현재 필터에 해당하는 참여자 또는 제출물이 없습니다.
                </section>
              ) : (
                filteredStatusRows.map((row) => {
                  const { participant, submission, feedback } = row;
                  const teamName = submission?.participant.teamName || programTeams.find((team) => team.id === participant.teamId)?.name || "팀명 없음";
                  const active = selectedStatusRow?.participant.id === participant.id;
                  return (
                    <article
                      key={participant.id}
                      className={`rounded-lg border bg-white p-5 shadow-sm ${active ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <button className="text-left" onClick={() => setSelectedParticipantId(participant.id)} type="button">
                          <h2 className="text-lg font-bold text-gray-950">{submission?.participant.ideaName || "아직 제출 전"}</h2>
                          <p className="mt-1 text-sm text-gray-600">{teamName} · {participant.name || participant.code}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusBadge type="participant" value={row.participantStatus} />
                            <StatusBadge type="submission" value={row.submissionStatus} />
                            <StatusBadge type="feedback" value={row.feedbackStatus} />
                            <StatusBadge type="pdf" value={row.pdfStatus} />
                          </div>
                          {submission ? (
                            <p className="mt-2 text-xs text-gray-500">제출 시간: {new Date(submission.createdAt).toLocaleString("ko-KR")}</p>
                          ) : (
                            <p className="mt-2 text-xs text-red-600">운영 확인 필요: 아직 연결된 제출물이 없습니다.</p>
                          )}
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {submission ? (
                            <>
                              <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold" href={`/preview/${submission.id}`}>
                                미리보기
                              </Link>
                              <Link
                                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                                  row.pdfStatus === "failed"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-blue-200 bg-blue-50 text-blue-800"
                                }`}
                                href={`/preview/${submission.id}?download=1`}
                              >
                                {row.pdfStatus === "failed" ? "PDF 재시도" : "PDF 다운로드"}
                              </Link>
                              <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" onClick={() => removeSubmission(submission)}>
                                삭제
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {submission && row.pdfStatus === "failed" ? (
                        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                          PDF 생성 실패 기록이 있습니다. PDF 재시도 버튼으로 다시 생성하고, 계속 실패하면 미리보기에서 바로 인쇄를 이용하세요.
                        </p>
                      ) : null}
                      {submission ? (
                        <form className="mt-4 grid gap-3" data-submission-id={submission.id} onSubmit={handleFeedback}>
                          <textarea
                            name="comment"
                            className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            defaultValue={feedback?.comment || ""}
                            placeholder="참여자가 다음 수정에 바로 쓸 수 있는 구체적 피드백"
                          />
                          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                            <input
                              name="nextAction"
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                              defaultValue={feedback?.nextAction || ""}
                              placeholder="다음 액션"
                            />
                            <select name="status" className="rounded-md border border-gray-300 px-3 py-2 text-sm" defaultValue={feedback?.status || "needs_revision"}>
                              <option value="needs_revision">수정 필요</option>
                              <option value="good">양호</option>
                              <option value="excellent">우수</option>
                            </select>
                            <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">피드백 저장</button>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
            <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
              <p className="text-sm font-semibold text-blue-700">선택 상세</p>
              {selectedStatusRow ? (
                <div className="mt-3 space-y-4 text-sm">
                  <div>
                    <h3 className="text-lg font-bold text-gray-950">
                      {selectedStatusRow.submission?.participant.ideaName || "제출 전 참여자"}
                    </h3>
                    <p className="mt-1 text-gray-600">
                      {selectedStatusRow.participant.name || "미등록"} · {selectedStatusRow.participant.code}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge type="participant" value={selectedStatusRow.participantStatus} />
                    <StatusBadge type="submission" value={selectedStatusRow.submissionStatus} />
                    <StatusBadge type="feedback" value={selectedStatusRow.feedbackStatus} />
                    <StatusBadge type="pdf" value={selectedStatusRow.pdfStatus} />
                  </div>
                  <dl className="grid gap-2 rounded-md bg-gray-50 p-3">
                    <div>
                      <dt className="text-gray-500">팀</dt>
                      <dd className="font-semibold text-gray-950">
                        {selectedStatusRow.submission?.participant.teamName ||
                          programTeams.find((team) => team.id === selectedStatusRow.participant.teamId)?.name ||
                          "미배정"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">제출 시간</dt>
                      <dd className="font-semibold text-gray-950">
                        {selectedStatusRow.submission ? new Date(selectedStatusRow.submission.createdAt).toLocaleString("ko-KR") : "미제출"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">다음 액션</dt>
                      <dd className="font-semibold text-gray-950">{selectedStatusRow.feedback?.nextAction || "운영진 확인 대기"}</dd>
                    </div>
                  </dl>
                  {selectedStatusRow.submission ? (
                    <div className="space-y-3">
                      {selectedStatusRow.pdfStatus === "failed" ? (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                          PDF 오류가 표시된 제출물입니다. 다운로드 재시도 후에도 실패하면 미리보기 화면에서 바로 인쇄하세요.
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Link className="inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href={`/preview/${selectedStatusRow.submission.id}`}>
                          제출물 열람
                        </Link>
                        <Link
                          className={`inline-flex rounded-md border px-4 py-2 text-sm font-bold ${
                            selectedStatusRow.pdfStatus === "failed"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-blue-200 bg-blue-50 text-blue-800"
                          }`}
                          href={`/preview/${selectedStatusRow.submission.id}?download=1`}
                        >
                          {selectedStatusRow.pdfStatus === "failed" ? "PDF 재생성" : "PDF 다운로드"}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      미제출 참여자입니다. 필요하면 미제출자 목록 복사 버튼으로 운영 메시지를 준비하세요.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">왼쪽 목록에서 참여자를 선택하세요.</p>
              )}
            </aside>
          </section>
        </main>
      ) : null}

      {tab === "moduleReviews" && currentProgram ? (
        <main className="grid gap-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">모듈별 관리자 검토</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">{currentProgram.name}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  교육생이 작성한 모듈 입력/결과 메모를 확인하고, 운영진 코멘트와 상태를 저장합니다.
                </p>
              </div>
              <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold"
                onClick={downloadModuleProgressCsv}
                type="button"
              >
                모듈 CSV 다운로드
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <MetricCard
                label="검토 필요"
                value={moduleReviewCounts.needsReview}
                hint="교육생 요청"
                tone={moduleReviewCounts.needsReview > 0 ? "amber" : "green"}
              />
              <MetricCard label="진행 중" value={moduleReviewCounts.inProgress} hint="임시저장 또는 작성 중" tone="blue" />
              <MetricCard label="완료" value={moduleReviewCounts.completed} hint="완료 표시된 모듈" tone="green" />
              <MetricCard label="전체 기록" value={moduleReviewCounts.all} hint="입력 또는 결과가 있는 모듈" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(moduleReviewFilterLabels) as ModuleReviewFilter[]).map((filter) => (
                <button
                  key={filter}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    moduleReviewFilter === filter ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-white text-gray-700"
                  }`}
                  onClick={() => setModuleReviewFilter(filter)}
                  type="button"
                >
                  {moduleReviewFilterLabels[filter]} {moduleReviewCounts[filter]}
                </button>
              ))}
            </div>
          </section>

          {filteredModuleReviewRows.length === 0 ? (
            <section className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-bold text-gray-950">현재 필터에 해당하는 모듈 기록이 없습니다</p>
              <p className="mt-2 text-sm text-gray-600">
                교육생이 모듈에서 임시 저장, 완료, 검토 필요 중 하나를 저장하면 이곳에 표시됩니다.
              </p>
            </section>
          ) : (
            <section className="grid gap-4">
              {filteredModuleReviewRows.map((row) => (
                <article
                  key={`${row.participant.id}-${row.module.slug}`}
                  className={`rounded-lg border bg-white p-5 shadow-sm ${
                    row.status === "needs_review" ? "border-amber-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">
                        STEP {row.module.order} · {row.team?.name || "미배정"} · {row.participant.name || row.participant.code}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-gray-950">{row.module.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{row.module.description}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        row.status === "needs_review"
                          ? "bg-amber-100 text-amber-800"
                          : row.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {moduleProgressStatusLabels[row.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <section className="rounded-md bg-gray-50 p-4">
                      <p className="text-sm font-bold text-gray-900">교육생 입력 메모</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {row.progress?.inputData || "입력 메모 없음"}
                      </p>
                    </section>
                    <section className="rounded-md bg-gray-50 p-4">
                      <p className="text-sm font-bold text-gray-900">교육생 결과 메모</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {row.progress?.outputData || "결과 메모 없음"}
                      </p>
                    </section>
                  </div>

                  <form
                    className="mt-4 grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]"
                    data-module-slug={row.module.slug}
                    data-participant-id={row.participant.id}
                    onSubmit={handleModuleReview}
                  >
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-gray-800">운영진 코멘트</span>
                      <textarea
                        name="adminComment"
                        className="min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        defaultValue={row.progress?.adminComment || ""}
                        placeholder="보완할 점, 확인한 점, 다음 행동을 적어주세요."
                      />
                      {row.progress?.reviewedAt ? (
                        <span className="mt-1 block text-xs text-gray-500">
                          마지막 검토: {new Date(row.progress.reviewedAt).toLocaleString("ko-KR")}
                        </span>
                      ) : null}
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-gray-800">검토 후 상태</span>
                      <select
                        name="status"
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        defaultValue={row.status}
                      >
                        <option value="not_started">시작 전</option>
                        <option value="in_progress">진행 중</option>
                        <option value="needs_review">검토 필요</option>
                        <option value="completed">완료</option>
                      </select>
                    </label>
                    <div className="flex items-end">
                      <button className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" type="submit">
                        검토 저장
                      </button>
                    </div>
                  </form>
                </article>
              ))}
            </section>
          )}
        </main>
      ) : null}

      {tab === "report" && stats ? (
        <main className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">결과보고서</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-950">{currentProgram?.name}</h2>
              <p className="mt-1 text-sm text-gray-600">제출 {stats.submissions}건 · 참여자 {stats.participants}명 · 제출률 {stats.submitRate}%</p>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold" onClick={downloadReportCsv}>
                결과 CSV 다운로드
              </button>
              <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold" onClick={downloadModuleProgressCsv}>
                모듈 CSV 다운로드
              </button>
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" onClick={() => window.print()}>
                결과보고 인쇄
              </button>
            </div>
          </div>
          <section className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-800">자동 요약</p>
                <p className="mt-2 text-sm leading-6 text-blue-950">{reportSummary}</p>
              </div>
              <button className="no-print rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-800" onClick={copyReportSummary}>
                보고서 팩 복사
              </button>
            </div>
          </section>
          <section className="mt-5 grid gap-3 md:grid-cols-4">
            <MetricCard
              label="모듈 완료율"
              value={moduleProgressMetrics.completionRate + "%"}
              hint={`${moduleProgressMetrics.completedTasks}/${moduleProgressMetrics.totalTasks}개 과제 완료`}
              tone={moduleProgressMetrics.completionRate >= 80 ? "green" : "amber"}
            />
            <MetricCard label="결과 메모" value={moduleReportOutputCount} hint="교육생이 남긴 모듈 결과" tone="blue" />
            <MetricCard
              label="검토 필요"
              value={moduleReviewCounts.needsReview}
              hint="운영진 확인 대상"
              tone={moduleReviewCounts.needsReview > 0 ? "amber" : "green"}
            />
            <MetricCard label="대표 메모" value={moduleReportHighlights.length} hint="보고서에 바로 옮길 후보" />
          </section>
          <section className="mt-5 rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-1 border-b border-gray-200 px-4 py-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-950">모듈 수행 요약</h3>
                <p className="text-sm text-gray-600">배정된 모듈별 완료율과 검토 필요 건수를 확인합니다.</p>
              </div>
              <p className="text-sm font-semibold text-gray-700">배정 모듈 {moduleReportRows.length}개</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3">모듈</th>
                    <th className="px-4 py-3">완료</th>
                    <th className="px-4 py-3">진행 중</th>
                    <th className="px-4 py-3">검토 필요</th>
                    <th className="px-4 py-3">결과 메모</th>
                    <th className="px-4 py-3">완료율</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleReportRows.length ? (
                    moduleReportRows.map((row) => (
                      <tr key={row.module.slug} className="border-t border-gray-200">
                        <td className="px-4 py-3">
                          <span className="block font-semibold text-gray-950">
                            {row.module.order}. {row.module.title}
                          </span>
                          <span className="text-xs text-gray-500">{row.module.category}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-700">
                          {row.completed}/{row.assigned}
                        </td>
                        <td className="px-4 py-3">{row.inProgress}</td>
                        <td className={`px-4 py-3 font-semibold ${row.needsReview > 0 ? "text-amber-700" : "text-gray-500"}`}>
                          {row.needsReview}
                        </td>
                        <td className="px-4 py-3">{row.outputCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-950">{row.completionRate}%</span>
                            <span className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                              <span className="block h-full rounded-full bg-blue-600" style={{ width: `${row.completionRate}%` }} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                        아직 선택된 모듈이 없습니다. 프로그램 설정에서 모듈을 배정하면 이곳에 요약됩니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-950">대표 결과 메모</h3>
                <p className="text-sm text-gray-600">결과보고서에 옮겨 쓸 만한 교육생 결과와 운영진 코멘트입니다.</p>
              </div>
              <button className="no-print text-sm font-bold text-blue-700 underline" onClick={copyReportSummary}>
                전체 복사
              </button>
            </div>
            {moduleReportHighlights.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {moduleReportHighlights.map((row) => {
                  const memo = row.progress?.outputData?.trim() || row.progress?.adminComment?.trim() || "";
                  return (
                    <article key={`${row.participant.id}-${row.module.slug}`} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">
                          {row.module.order}. {row.module.title}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          {moduleProgressStatusLabels[row.status]}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-bold text-gray-950">
                        {row.participant.name || row.participant.code}
                        {row.team ? ` · ${row.team.name}` : ""}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{memo}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
                아직 보고서에 넣을 모듈 결과 메모가 없습니다. 교육생이 모듈을 저장하거나 운영진이 검토 코멘트를 남기면 표시됩니다.
              </p>
            )}
          </section>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">팀</th>
                  <th className="px-4 py-3">작성자</th>
                  <th className="px-4 py-3">아이디어</th>
                  <th className="px-4 py-3">피드백</th>
                  <th className="px-4 py-3">열람</th>
                </tr>
              </thead>
              <tbody>
                {programSubmissions.map((submission) => {
                  const feedback = state ? findFeedback(state, submission.id) : undefined;
                  return (
                    <tr key={submission.id} className="border-t border-gray-200">
                      <td className="px-4 py-3">{submission.participant.teamName || "-"}</td>
                      <td className="px-4 py-3">{submission.participant.participantName || "-"}</td>
                      <td className="px-4 py-3">{submission.participant.ideaName || "-"}</td>
                      <td className="px-4 py-3">{feedback?.status || "미작성"}</td>
                      <td className="px-4 py-3">
                        <Link className="font-semibold text-blue-700 underline" href={`/preview/${submission.id}`}>
                          보기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      ) : null}
    </div>
  );
}
