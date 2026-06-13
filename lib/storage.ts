"use client";

import type { LeanCanvasDraft, LeanCanvasSubmission, ParticipantInput } from "@/lib/types";

const DRAFT_KEY = "lean-canvas-current-draft";
const SUBMISSIONS_KEY = "lean-canvas-submissions";

export interface DraftSession {
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}

const isBrowser = () => typeof window !== "undefined";

export function saveDraftSession(draft: DraftSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraftSession(): DraftSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftSession;
  } catch {
    return null;
  }
}

export function clearDraftSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function loadSubmissions(): LeanCanvasSubmission[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(SUBMISSIONS_KEY);
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
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  clearDraftSession();
  return submission;
}

export function getSubmission(id: string) {
  return loadSubmissions().find((submission) => submission.id === id) ?? null;
}

export function deleteSubmission(id: string) {
  if (!isBrowser()) return [];
  const submissions = loadSubmissions().filter((submission) => submission.id !== id);
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  return submissions;
}
