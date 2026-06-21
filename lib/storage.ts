"use client";

import type {
  LeanCanvasDraft,
  LeanCanvasSubmission,
  ModuStartupDraft,
  ModuStartupInput,
  ModuStartupSubmission,
  PdfStatus,
  ParticipantInput
} from "@/lib/types";

const DRAFT_KEY = "lean-canvas-current-draft";
const SUBMISSIONS_KEY = "lean-canvas-submissions";
const PREFILL_KEY = "lean-canvas-participant-prefill";
const MODU_STARTUP_SUBMISSIONS_KEY = "modu-startup-submissions";
const MODU_STARTUP_DRAFT_KEY = "modu-startup-current-draft";
const MODU_STARTUP_PREFILL_KEY = "modu-startup-participant-prefill";
const MODULE_DRAFT_KEY_PREFIX = "highviewlab-module-draft-v1:";

export interface BrowserTemporaryStorageSummary {
  draftCount: number;
  fallbackSubmissionCount: number;
  sessionPrefillCount: number;
}

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

const listLocalStorageKeys = () => {
  if (!isBrowser()) return [];
  try {
    return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter(
      (key): key is string => Boolean(key)
    );
  } catch {
    return [];
  }
};

const localStorageHasKey = (key: string) => readLocalStorage(key) !== null;

const sessionStorageHasKey = (key: string) => readSessionStorage(key) !== null;

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

export function saveModuStartupPrefill(input: ModuStartupInput) {
  writeSessionStorage(MODU_STARTUP_PREFILL_KEY, JSON.stringify(input));
}

export function loadModuStartupPrefill(): ModuStartupInput | null {
  const raw = readSessionStorage(MODU_STARTUP_PREFILL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ModuStartupInput;
  } catch {
    return null;
  }
}

export function clearModuStartupPrefill() {
  removeSessionStorage(MODU_STARTUP_PREFILL_KEY);
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
  const createdAt = new Date().toISOString();
  const submission: LeanCanvasSubmission = {
    id: crypto.randomUUID(),
    createdAt,
    participant,
    canvas,
    submissionStatus: "submitted",
    pdfStatus: "idle",
    pdfStatusUpdatedAt: createdAt
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

export function updateSubmissionPdfStatus(id: string, status: PdfStatus, errorMessage = "") {
  const submissions = loadSubmissions();
  const statusUpdatedAt = new Date().toISOString();
  const generatedAt = status === "success" ? statusUpdatedAt : undefined;
  const updated = submissions.map((submission) =>
    submission.id === id
      ? {
          ...submission,
          pdfStatus: status,
          pdfErrorMessage: status === "failed" ? errorMessage : "",
          pdfGeneratedAt: generatedAt,
          pdfStatusUpdatedAt: statusUpdatedAt
        }
      : submission
  );

  writeLocalStorage(SUBMISSIONS_KEY, JSON.stringify(updated));
  return updated.find((submission) => submission.id === id) ?? null;
}

export function loadModuStartupSubmissions(): ModuStartupSubmission[] {
  const raw = readLocalStorage(MODU_STARTUP_SUBMISSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ModuStartupSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveModuStartupSubmission(input: ModuStartupInput, draft: ModuStartupDraft) {
  const createdAt = new Date().toISOString();
  const submission: ModuStartupSubmission = {
    id: crypto.randomUUID(),
    createdAt,
    input,
    draft,
    submissionStatus: "submitted",
    pdfStatus: "idle",
    pdfStatusUpdatedAt: createdAt
  };
  const submissions = [submission, ...loadModuStartupSubmissions()];
  writeLocalStorage(MODU_STARTUP_SUBMISSIONS_KEY, JSON.stringify(submissions));
  return submission;
}

export function getModuStartupSubmission(id: string) {
  return loadModuStartupSubmissions().find((submission) => submission.id === id) ?? null;
}

export function deleteModuStartupSubmission(id: string) {
  if (!isBrowser()) return [];
  const submissions = loadModuStartupSubmissions().filter((submission) => submission.id !== id);
  writeLocalStorage(MODU_STARTUP_SUBMISSIONS_KEY, JSON.stringify(submissions));
  return submissions;
}

export function updateModuStartupSubmissionPdfStatus(id: string, status: PdfStatus, errorMessage = "") {
  const submissions = loadModuStartupSubmissions();
  const statusUpdatedAt = new Date().toISOString();
  const generatedAt = status === "success" ? statusUpdatedAt : undefined;
  const updated = submissions.map((submission) =>
    submission.id === id
      ? {
          ...submission,
          pdfStatus: status,
          pdfErrorMessage: status === "failed" ? errorMessage : "",
          pdfGeneratedAt: generatedAt,
          pdfStatusUpdatedAt: statusUpdatedAt
        }
      : submission
  );

  writeLocalStorage(MODU_STARTUP_SUBMISSIONS_KEY, JSON.stringify(updated));
  return updated.find((submission) => submission.id === id) ?? null;
}

export function getBrowserTemporaryStorageSummary(): BrowserTemporaryStorageSummary {
  const localKeys = listLocalStorageKeys();
  const moduleDraftCount = localKeys.filter((key) => key.startsWith(MODULE_DRAFT_KEY_PREFIX)).length;
  const draftCount =
    moduleDraftCount +
    [DRAFT_KEY, MODU_STARTUP_DRAFT_KEY].filter((key) => localStorageHasKey(key)).length;

  return {
    draftCount,
    fallbackSubmissionCount: loadSubmissions().length + loadModuStartupSubmissions().length,
    sessionPrefillCount: [PREFILL_KEY, MODU_STARTUP_PREFILL_KEY].filter((key) => sessionStorageHasKey(key)).length
  };
}

export function clearBrowserTemporaryDrafts() {
  const localDraftKeys = Array.from(new Set([
    DRAFT_KEY,
    MODU_STARTUP_DRAFT_KEY,
    ...listLocalStorageKeys().filter((key) => key.startsWith(MODULE_DRAFT_KEY_PREFIX))
  ]));
  const sessionPrefillKeys = [PREFILL_KEY, MODU_STARTUP_PREFILL_KEY];
  const clearedCount =
    localDraftKeys.filter((key) => localStorageHasKey(key)).length +
    sessionPrefillKeys.filter((key) => sessionStorageHasKey(key)).length;

  localDraftKeys.forEach(removeLocalStorage);
  sessionPrefillKeys.forEach(removeSessionStorage);

  return clearedCount;
}
