"use client";

export type ModuleDraftSaveStatus = "idle" | "saving" | "saved" | "error";

export interface ModuleDraftIdentity {
  programId: string;
  participantId: string;
  moduleSlug: string;
}

export interface ModuleDraftPayload<TDraftData extends Record<string, unknown> = Record<string, unknown>>
  extends ModuleDraftIdentity {
  draftData: TDraftData;
  currentStep?: number;
}

export interface ModuleDraftRecord<TDraftData extends Record<string, unknown> = Record<string, unknown>>
  extends ModuleDraftIdentity {
  id?: string;
  draftData: TDraftData;
  currentStep: number;
  savedAt: string;
  fallback?: boolean;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function getLocalDraftKey(identity: ModuleDraftIdentity) {
  return `highviewlab-module-draft-v1:${identity.programId}:${identity.participantId}:${identity.moduleSlug}`;
}

function canUseIdentity(identity: Partial<ModuleDraftIdentity>): identity is ModuleDraftIdentity {
  return Boolean(identity.programId && identity.participantId && identity.moduleSlug);
}

function saveLocalModuleDraft<TDraftData extends Record<string, unknown>>(payload: ModuleDraftPayload<TDraftData>) {
  const savedAt = new Date().toISOString();
  if (!isBrowser()) return savedAt;

  try {
    window.localStorage.setItem(
      getLocalDraftKey(payload),
      JSON.stringify({
        ...payload,
        currentStep: payload.currentStep ?? 0,
        savedAt,
        fallback: true
      })
    );
  } catch {
    // Browser storage may be blocked in private or embedded contexts.
  }

  return savedAt;
}

function loadLocalModuleDraft<TDraftData extends Record<string, unknown>>(
  identity: ModuleDraftIdentity
): ModuleDraftRecord<TDraftData> | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getLocalDraftKey(identity));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ModuleDraftRecord<TDraftData>;
    if (!parsed?.draftData || !parsed.savedAt) return null;
    return { ...parsed, fallback: true };
  } catch {
    return null;
  }
}

export async function loadModuleDraft<TDraftData extends Record<string, unknown>>(
  identity: Partial<ModuleDraftIdentity>
): Promise<ModuleDraftRecord<TDraftData> | null> {
  if (!canUseIdentity(identity)) return null;

  const params = new URLSearchParams({
    programId: identity.programId,
    participantId: identity.participantId,
    moduleSlug: identity.moduleSlug
  });

  try {
    const response = await fetch(`/api/module-drafts?${params.toString()}`);
    const data = (await response.json()) as {
      draft?: ModuleDraftRecord<TDraftData> | null;
      code?: string;
    };

    if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
      return loadLocalModuleDraft<TDraftData>(identity);
    }

    if (!response.ok) return loadLocalModuleDraft<TDraftData>(identity);
    return data.draft ?? loadLocalModuleDraft<TDraftData>(identity);
  } catch {
    return loadLocalModuleDraft<TDraftData>(identity);
  }
}

export async function saveModuleDraft<TDraftData extends Record<string, unknown>>(
  payload: ModuleDraftPayload<TDraftData>
): Promise<ModuleDraftRecord<TDraftData>> {
  if (!canUseIdentity(payload)) {
    throw new Error("참여자 세션이 없어 서버 draft를 저장할 수 없습니다.");
  }

  try {
    const response = await fetch("/api/module-drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as {
      draft?: ModuleDraftRecord<TDraftData>;
      code?: string;
      error?: string;
    };

    if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
      const savedAt = saveLocalModuleDraft(payload);
      return { ...payload, currentStep: payload.currentStep ?? 0, savedAt, fallback: true };
    }

    if (!response.ok || !data.draft) {
      throw new Error(data.error || "draft 저장 실패");
    }

    return data.draft;
  } catch (error) {
    const savedAt = saveLocalModuleDraft(payload);
    if (savedAt) {
      return { ...payload, currentStep: payload.currentStep ?? 0, savedAt, fallback: true };
    }

    throw error;
  }
}
