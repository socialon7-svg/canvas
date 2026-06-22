const STORAGE_PREFIX = "highview_submission_request";

interface StoredSubmissionRequest {
  fingerprint: string;
  requestId: string;
}

function hashPayload(payload: unknown) {
  const value = JSON.stringify(payload);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(16)}`;
}

function createRequestId() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function storageKey(scope: string) {
  return `${STORAGE_PREFIX}:${scope}`;
}

export function getOrCreateSubmissionRequestId(scope: string, payload: unknown) {
  const fingerprint = hashPayload(payload);
  const key = storageKey(scope);

  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || "null") as StoredSubmissionRequest | null;
    if (stored?.fingerprint === fingerprint && stored.requestId) return stored.requestId;
  } catch {
    // A fresh request id is enough when browser storage is unavailable or corrupted.
  }

  const requestId = createRequestId();
  try {
    window.localStorage.setItem(key, JSON.stringify({ fingerprint, requestId } satisfies StoredSubmissionRequest));
  } catch {
    // The request remains safe for repeated clicks in the current submit attempt.
  }
  return requestId;
}
