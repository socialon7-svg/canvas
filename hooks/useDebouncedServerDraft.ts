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
  const payloadRef = useRef({ programId, participantId, moduleSlug, draftData, currentStep });
  const lastSignatureRef = useRef("");
  const draftSignature = useMemo(() => JSON.stringify(draftData), [draftData]);
  const canSave = Boolean(enabled && shouldSave && programId && participantId && moduleSlug);

  useEffect(() => {
    payloadRef.current = { programId, participantId, moduleSlug, draftData, currentStep };
  }, [currentStep, draftData, moduleSlug, participantId, programId]);

  const saveNow = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload.programId || !payload.participantId || !payload.moduleSlug || !enabled || !shouldSave) {
      return;
    }

    const signature = JSON.stringify({
      draftData: payload.draftData,
      currentStep: payload.currentStep
    });
    if (signature === lastSignatureRef.current && status === "saved") return;

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
      setFallbackMode(Boolean(result.fallback));
      setStatus("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "자동저장에 실패했습니다.");
      setStatus("error");
    }
  }, [enabled, shouldSave, status]);

  useEffect(() => {
    if (!canSave) return;

    const timer = window.setTimeout(() => {
      void saveNow();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [canSave, currentStep, debounceMs, draftSignature, saveNow]);

  return {
    status,
    lastSavedAt,
    error,
    fallbackMode,
    saveNow
  };
}
