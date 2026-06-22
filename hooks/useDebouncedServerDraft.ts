"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  saveModuleDraft,
  type ModuleDraftSaveStatus
} from "@/lib/moduleDraftClient";

interface UseDebouncedServerDraftOptions<TDraftData extends Record<string, unknown>> {
  programId?: string;
  participantId?: string;
  moduleSlug: string;
  draftData: TDraftData;
  currentStep?: number;
  enabled?: boolean;
  shouldSave?: boolean;
  debounceMs?: number;
}

export function useDebouncedServerDraft<TDraftData extends Record<string, unknown>>({
  programId,
  participantId,
  moduleSlug,
  draftData,
  currentStep = 0,
  enabled = true,
  shouldSave = true,
  debounceMs = 900
}: UseDebouncedServerDraftOptions<TDraftData>) {
  const [status, setStatus] = useState<ModuleDraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [error, setError] = useState("");
  const [fallbackMode, setFallbackMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const payloadRef = useRef({ programId, participantId, moduleSlug, draftData, currentStep });
  const lastSignatureRef = useRef("");
  const statusRef = useRef<ModuleDraftSaveStatus>("idle");
  const fallbackModeRef = useRef(false);
  const draftSignature = useMemo(() => JSON.stringify(draftData), [draftData]);
  const canSave = Boolean(enabled && shouldSave && programId && participantId && moduleSlug);

  useEffect(() => {
    payloadRef.current = { programId, participantId, moduleSlug, draftData, currentStep };
  }, [currentStep, draftData, moduleSlug, participantId, programId]);

  const persistDraft = useCallback(async (force = false) => {
    const payload = payloadRef.current;
    if (!payload.programId || !payload.participantId || !payload.moduleSlug || !enabled || !shouldSave) {
      return;
    }

    const signature = JSON.stringify({
      draftData: payload.draftData,
      currentStep: payload.currentStep
    });
    if (!force && signature === lastSignatureRef.current && statusRef.current === "saved") return;

    statusRef.current = "saving";
    setStatus("saving");
    setError("");
    try {
      const result = await saveModuleDraft({
        programId: payload.programId,
        participantId: payload.participantId,
        moduleSlug: payload.moduleSlug,
        draftData: payload.draftData,
        currentStep: payload.currentStep
      });
      lastSignatureRef.current = signature;
      setLastSavedAt(result.savedAt);
      fallbackModeRef.current = Boolean(result.fallback);
      setFallbackMode(fallbackModeRef.current);
      statusRef.current = "saved";
      setStatus("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "자동저장에 실패했습니다.");
      statusRef.current = "error";
      setStatus("error");
    }
  }, [enabled, shouldSave]);

  const saveNow = useCallback(() => persistDraft(true), [persistDraft]);

  useEffect(() => {
    if (!canSave) return;

    const timer = window.setTimeout(() => {
      void persistDraft(false);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [canSave, currentStep, debounceMs, draftSignature, persistDraft]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => {
      setIsOnline(true);
      if (fallbackModeRef.current) void persistDraft(true);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [persistDraft]);

  return {
    status,
    lastSavedAt,
    error,
    fallbackMode,
    isOnline,
    saveNow
  };
}
