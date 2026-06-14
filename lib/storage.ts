"use client";

import type { LeanCanvasDraft, LeanCanvasSubmission, ParticipantInput } from "@/lib/types";

const DRAFT_KEY = "lean-canvas-current-draft";
const SUBMISSIONS_KEY = "lean-canvas-submissions";
const PREFILL_KEY = "lean-canvas-participant-prefill";

export interface DraftSession {
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}

const isBrowser = () => typeof window !== "undefined";

const readLocalStorage = (key: string) => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: string) => {
  if (!isBrowser()) return;
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }
};

const removeLocalStorage = (key: string) => {
  if (!isBrowser()) return;
  try {
    window.localStorage?.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
};

const readSessionStorage = (key: string) => {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeSessionStorage = (key: string, value: string) => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
};

const removeSessionStorage = (key: string) => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
};

export function saveDraftSession(draft: DraftSession) {
  if (!isBrowser()) return;
  writeLocalStorage(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraftSession(): DraftSession | null {
  const raw = readLocalStorage(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftSession;
  } catch {
    return null;
  }
}

export function clearDraftSession() {
  removeLocalStorage(DRAFT_KEY);
}

export function saveParticipantPrefill(participant: ParticipantInput) {
  writeSessionStorage(PREFILL_KEY, JSON.stringify(participant));
}

export function loadParticipantPrefill(): ParticipantInput | null {
  const raw = readSessionStorage(PREFILL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParticipantInput;
  } catch {
    return null;
  }
}

export function clearParticipantPrefill() {
  removeSessionStorage(PREFILL_KEY);
}

export function loadSubmissions(): LeanCanvasSubmission[] {
  const raw = readLocalStorage(SUBMISSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LeanCanvasSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubmission(participant: ParticipantInput, canvas: LeanCanvasDraft) {
  const submission: LeanCanvasSubmission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    participant,
    canvas
  };
  const submissions = [submission, ...loadSubmissions()];
  writeLocalStorage(SUBMISSIONS_KEY, JSON.stringify(submissions));
  clearDraftSession();
  return submission;
}

export function getSubmission(id: string) {
  return loadSubmissions().find((submission) => submission.id === id) ?? null;
}

export function deleteSubmission(id: string) {
  if (!isBrowser()) return [];
  const submissions = loadSubmissions().filter((submission) => submission.id !== id);
  writeLocalStorage(SUBMISSIONS_KEY, JSON.stringify(submissions));
  return submissions;
}
