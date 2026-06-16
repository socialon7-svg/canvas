"use client";

import type {
  HighViewOperationsState,
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

export function mergeParticipantEntryIntoOperationsState(input: {
  program: HighViewProgram;
  participant: HighViewParticipant;
  team?: HighViewTeam | null;
}) {
  if (!isBrowser()) return defaultOperationsState();

  const state = loadOperationsState();
  const nextState: HighViewOperationsState = normalizeOperationsState({
    ...state,
    programs: [input.program, ...state.programs.filter((program) => program.id !== input.program.id)],
    participants: [
      input.participant,
      ...state.participants.filter((participant) => participant.id !== input.participant.id)
    ],
    teams: input.team
      ? [input.team, ...state.teams.filter((team) => team.id !== input.team?.id)]
      : state.teams
  });

  saveOperationsState(nextState);
  writeParticipantSession(input.program.id, input.participant.id);
  return nextState;
}
