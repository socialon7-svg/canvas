"use client";

import type {
  FeedbackStatus,
  HighViewFeedback,
  HighViewOperationsState,
  HighViewParticipant,
  HighViewProgram,
  HighViewTeam,
  LeanCanvasSubmission,
  ModuStartupInput,
  ParticipantInput
} from "@/lib/types";

const OPERATIONS_KEY = "highviewlab-operations-state-v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredState() {
  if (!isBrowser()) return null;
  try {
    return window.localStorage?.getItem(OPERATIONS_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredState(value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage?.setItem(OPERATIONS_KEY, value);
  } catch {
    // Storage may be disabled in embedded or private browser contexts.
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uuid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeCode(prefix: string) {
  const body = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return `${prefix}-${body || "DEMO"}`;
}

export function defaultOperationsState(): HighViewOperationsState {
  const programId = uuid("program");
  const teamA = uuid("team");
  const teamB = uuid("team");
  return {
    version: 1,
    programs: [
      {
        id: programId,
        name: "동서대 AI 아이디어 캠프 데모",
        clientName: "동서대학교",
        startDate: todayISO(),
        endDate: todayISO(),
        programCode: "HV-DEMO",
        status: "active",
        createdAt: new Date().toISOString(),
        brief: "참여자가 린캔버스 과제를 제출하고 내부직원이 운영 현황과 피드백을 관리하는 데모 프로그램입니다."
      }
    ],
    participants: [
      {
        id: uuid("participant"),
        programId,
        code: "P-DEMO1",
        name: "김민지",
        email: "minji@example.com",
        phone: "",
        school: "동서대",
        major: "디자인",
        teamId: teamA,
        role: "팀장",
        joinedAt: "",
        lastSeenAt: ""
      },
      {
        id: uuid("participant"),
        programId,
        code: "P-DEMO2",
        name: "이준호",
        email: "junho@example.com",
        phone: "",
        school: "동서대",
        major: "컴퓨터공학",
        teamId: teamA,
        role: "팀원",
        joinedAt: "",
        lastSeenAt: ""
      },
      {
        id: uuid("participant"),
        programId,
        code: "P-DEMO3",
        name: "",
        email: "",
        phone: "",
        school: "",
        major: "",
        teamId: teamB,
        role: "팀원",
        joinedAt: "",
        lastSeenAt: ""
      }
    ],
    teams: [
      { id: teamA, programId, name: "A-1팀", memo: "데모 팀", createdAt: new Date().toISOString() },
      { id: teamB, programId, name: "A-2팀", memo: "데모 팀", createdAt: new Date().toISOString() }
    ],
    feedbacks: []
  };
}

export function normalizeOperationsState(value: unknown): HighViewOperationsState {
  const fallback = defaultOperationsState();
  if (!value || typeof value !== "object") return fallback;
  const state = value as Partial<HighViewOperationsState>;
  return {
    version: 1,
    programs: Array.isArray(state.programs) ? state.programs : fallback.programs,
    participants: Array.isArray(state.participants) ? state.participants : fallback.participants,
    teams: Array.isArray(state.teams) ? state.teams : fallback.teams,
    feedbacks: Array.isArray(state.feedbacks) ? state.feedbacks : []
  };
}

export function loadOperationsState() {
  if (!isBrowser()) return defaultOperationsState();
  const raw = readStoredState();
  if (!raw) {
    const initial = defaultOperationsState();
    saveOperationsState(initial);
    return initial;
  }
  try {
    return normalizeOperationsState(JSON.parse(raw));
  } catch {
    const initial = defaultOperationsState();
    saveOperationsState(initial);
    return initial;
  }
}

export function saveOperationsState(state: HighViewOperationsState) {
  if (!isBrowser()) return;
  writeStoredState(JSON.stringify(normalizeOperationsState(state)));
}

export function resetOperationsState() {
  const initial = defaultOperationsState();
  saveOperationsState(initial);
  return initial;
}

export function createProgram(input: Pick<HighViewProgram, "name" | "clientName" | "startDate" | "endDate" | "brief">) {
  return {
    id: uuid("program"),
    name: input.name,
    clientName: input.clientName,
    startDate: input.startDate || todayISO(),
    endDate: input.endDate || input.startDate || todayISO(),
    programCode: makeCode("HV"),
    status: "active",
    createdAt: new Date().toISOString(),
    brief: input.brief
  } satisfies HighViewProgram;
}

export function createParticipant(programId: string, school = "") {
  return {
    id: uuid("participant"),
    programId,
    code: makeCode("P"),
    name: "",
    email: "",
    phone: "",
    school,
    major: "",
    teamId: "",
    role: "팀원",
    joinedAt: "",
    lastSeenAt: ""
  } satisfies HighViewParticipant;
}

export function createTeam(programId: string, name: string, memo: string) {
  return {
    id: uuid("team"),
    programId,
    name,
    memo,
    createdAt: new Date().toISOString()
  } satisfies HighViewTeam;
}

export function getProgramStats(state: HighViewOperationsState, programId: string, submissions: LeanCanvasSubmission[] = []) {
  const participants = state.participants.filter((participant) => participant.programId === programId);
  const teams = state.teams.filter((team) => team.programId === programId);
  const programSubmissions = submissions.filter((submission) => submission.participant.operation?.programId === programId);
  const submittedIds = new Set([
    ...participants.filter((participant) => participant.latestSubmissionId).map((participant) => participant.id),
    ...programSubmissions.map((submission) => submission.participant.operation?.participantId).filter(Boolean)
  ]);

  return {
    participants: participants.length,
    joined: participants.filter((participant) => participant.joinedAt).length,
    teams: teams.length,
    submissions: programSubmissions.length,
    submitted: submittedIds.size,
    feedbacks: state.feedbacks.filter((feedback) => feedback.programId === programId).length,
    submitRate: participants.length ? Math.round((submittedIds.size / participants.length) * 100) : 0
  };
}

export function toParticipantInput(
  program: HighViewProgram,
  participant: HighViewParticipant,
  team?: HighViewTeam
): ParticipantInput {
  return {
    educationName: program.name,
    teamName: team?.name || "",
    participantName: participant.name || participant.code,
    ideaName: "",
    ideaSummary: "",
    targetCustomer: "",
    problemToSolve: "",
    existingAlternative: "",
    ourSolution: "",
    revenueModel: "",
    differentiation: "",
    operation: {
      programId: program.id,
      programCode: program.programCode,
      programName: program.name,
      participantId: participant.id,
      participantCode: participant.code,
      teamId: team?.id || participant.teamId,
      teamName: team?.name || "",
      role: participant.role
    }
  };
}

export function toModuStartupInput(
  program: HighViewProgram,
  participant: HighViewParticipant,
  team?: HighViewTeam
): ModuStartupInput {
  return {
    programName: program.name,
    teamName: team?.name || "",
    participantName: participant.name || participant.code,
    ideaTitle: "",
    ideaOneLine: "",
    backgroundStory: "",
    customerProblem: "",
    executionPlan: "",
    category: "",
    businessStatus: "현재 사업자 아님",
    teamMembers: "",
    videoUrl: "",
    operation: {
      programId: program.id,
      programCode: program.programCode,
      programName: program.name,
      participantId: participant.id,
      participantCode: participant.code,
      teamId: team?.id || participant.teamId,
      teamName: team?.name || "",
      role: participant.role
    }
  };
}

export function recordParticipantSubmission(participantInput: ParticipantInput, submissionId: string) {
  const participantId = participantInput.operation?.participantId;
  if (!participantId || !isBrowser()) return;
  const state = loadOperationsState();
  const participant = state.participants.find((item) => item.id === participantId);
  if (!participant) return;
  participant.latestSubmissionId = submissionId;
  participant.submittedAt = new Date().toISOString();
  participant.lastSeenAt = new Date().toISOString();
  saveOperationsState(state);
}

export function recordModuStartupSubmission(input: ModuStartupInput, submissionId: string) {
  const participantId = input.operation?.participantId;
  if (!participantId || !isBrowser()) return;
  const state = loadOperationsState();
  const participant = state.participants.find((item) => item.id === participantId);
  if (!participant) return;
  participant.latestModuStartupSubmissionId = submissionId;
  participant.moduStartupSubmittedAt = new Date().toISOString();
  participant.lastSeenAt = new Date().toISOString();
  saveOperationsState(state);
}

export function saveFeedback(
  state: HighViewOperationsState,
  input: {
    programId: string;
    participantId: string;
    submissionId: string;
    comment: string;
    nextAction: string;
    status: FeedbackStatus;
  }
) {
  const existing = state.feedbacks.find((feedback) => feedback.submissionId === input.submissionId);
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, { ...input, updatedAt: now });
    return existing;
  }
  const feedback: HighViewFeedback = {
    id: uuid("feedback"),
    ...input,
    createdAt: now,
    updatedAt: now
  };
  state.feedbacks.push(feedback);
  return feedback;
}

export function findFeedback(state: HighViewOperationsState, submissionId?: string) {
  if (!submissionId) return undefined;
  return state.feedbacks
    .filter((feedback) => feedback.submissionId === submissionId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function exportOperationsState(state: HighViewOperationsState) {
  const blob = new Blob([JSON.stringify(normalizeOperationsState(state), null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `highviewlab-operations-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
