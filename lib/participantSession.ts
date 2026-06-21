"use client";

import type {
  HighViewOperationsState,
  HighViewFeedback,
  HighViewParticipant,
  HighViewProgram,
  HighViewTeam
} from "@/lib/types";
import {
  defaultOperationsState,
  loadOperationsState,
  normalizeOperationsState,
  saveOperationsState
} from "@/lib/operationsStorage";

export const PROGRAM_SESSION_KEY = "highviewlab-participant-program-id";
export const PARTICIPANT_SESSION_KEY = "highviewlab-participant-id";

export interface ParticipantWorkspaceResponse {
  program?: HighViewProgram;
  participant?: HighViewParticipant;
  team?: HighViewTeam | null;
  feedbacks?: HighViewFeedback[];
  code?: string;
  error?: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function readParticipantSession() {
  if (!isBrowser()) return { programId: "", participantId: "" };

  try {
    return {
      programId: window.sessionStorage?.getItem(PROGRAM_SESSION_KEY) || "",
      participantId: window.sessionStorage?.getItem(PARTICIPANT_SESSION_KEY) || ""
    };
  } catch {
    return { programId: "", participantId: "" };
  }
}

export function writeParticipantSession(programId: string, participantId: string) {
  if (!isBrowser()) return;

  try {
    window.sessionStorage?.setItem(PROGRAM_SESSION_KEY, programId);
    window.sessionStorage?.setItem(PARTICIPANT_SESSION_KEY, participantId);
  } catch {
    // Session storage can be blocked in embedded browser contexts.
  }
}

export function clearParticipantSession() {
  if (!isBrowser()) return;

  try {
    window.sessionStorage?.removeItem(PROGRAM_SESSION_KEY);
    window.sessionStorage?.removeItem(PARTICIPANT_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function fetchParticipantWorkspace(signal?: AbortSignal) {
  const response = await fetch("/api/participants/session", {
    credentials: "same-origin",
    cache: "no-store",
    signal
  });
  const data = (await response.json().catch(() => ({}))) as ParticipantWorkspaceResponse;
  if (response.status === 401 || response.status === 404) {
    clearParticipantSession();
  }
  return { response, data };
}

function mergeModuleProgress(current: HighViewParticipant | undefined, incoming: HighViewParticipant) {
  const merged = { ...(incoming.moduleProgress || {}) };
  for (const [slug, localProgress] of Object.entries(current?.moduleProgress || {})) {
    const serverProgress = merged[slug];
    if (!serverProgress || new Date(localProgress.updatedAt).getTime() > new Date(serverProgress.updatedAt).getTime()) {
      merged[slug] = localProgress;
    }
  }
  return merged;
}

export function mergeParticipantEntryIntoOperationsState(input: {
  program: HighViewProgram;
  participant: HighViewParticipant;
  team?: HighViewTeam | null;
  feedbacks?: HighViewFeedback[];
}) {
  if (!isBrowser()) return defaultOperationsState();

  const state = loadOperationsState();
  const currentParticipant = state.participants.find((participant) => participant.id === input.participant.id);
  const participant = {
    ...input.participant,
    moduleProgress: mergeModuleProgress(currentParticipant, input.participant)
  };
  const nextState: HighViewOperationsState = normalizeOperationsState({
    ...state,
    programs: [input.program, ...state.programs.filter((program) => program.id !== input.program.id)],
    participants: [
      participant,
      ...state.participants.filter((participant) => participant.id !== input.participant.id)
    ],
    teams: input.team
      ? [input.team, ...state.teams.filter((team) => team.id !== input.team?.id)]
      : state.teams,
    feedbacks: input.feedbacks
      ? [
          ...input.feedbacks,
          ...state.feedbacks.filter((feedback) => feedback.participantId !== input.participant.id)
        ]
      : state.feedbacks
  });

  saveOperationsState(nextState);
  writeParticipantSession(input.program.id, input.participant.id);
  return nextState;
}
