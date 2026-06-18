"use client";

import { useMemo, useState } from "react";
import type { HighViewParticipant, HighViewProgram, HighViewTeam, ParticipantModuleProgressStatus } from "@/lib/types";
import {
  formatStartupModuleDraft,
  getStartupModuleAutomationConfigs,
  type AutomatedStartupModuleDraft
} from "@/lib/startupModuleAutomation";
import { getStartupModuleBySlug } from "@/lib/startupModules";

interface Props {
  program: HighViewProgram;
  participants: HighViewParticipant[];
  teams: HighViewTeam[];
  onSaved: () => Promise<void> | void;
}

const adminModules = getStartupModuleAutomationConfigs({ adminOnly: true });

export default function InternalAiOperationsGenerator({ program, participants, teams, onSaved }: Props) {
  const [participantId, setParticipantId] = useState(participants[0]?.id || "");
  const [moduleSlug, setModuleSlug] = useState(adminModules[0]?.slug || "");
  const [memo, setMemo] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const participant = participants.find((item) => item.id === participantId) || participants[0];
  const team = participant ? teams.find((item) => item.id === participant.teamId) : undefined;
  const config = adminModules.find((item) => item.slug === moduleSlug) || adminModules[0];
  const previousResults = useMemo(
    () =>
      Object.entries(participant?.moduleProgress || {})
        .filter(([, progress]) => progress.outputData?.trim())
        .map(([slug, progress]) => `[${getStartupModuleBySlug(slug)?.title || slug}]\n${progress.outputData.slice(0, 1800)}`)
        .join("\n\n")
        .slice(0, 10000),
    [participant]
  );

  const saveResult = async (status: ParticipantModuleProgressStatus, nextOutput = output) => {
    if (!participant || !config) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/module-progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: program.id,
          participantId: participant.id,
          moduleSlug: config.slug,
          status,
          currentStep: status === "completed" ? 100 : 50,
          inputData: { text: memo.trim() },
          outputData: { text: nextOutput.trim() }
        })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "운영자료를 저장하지 못했습니다.");
      setNotice(status === "completed" ? `${config.title} 결과를 저장했습니다.` : "AI 초안과 입력 메모를 저장했습니다.");
      await onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "운영자료 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!participant || !config || !memo.trim()) return;
    setGenerating(true);
    setError("");
    setNotice(config.generatingMessage);
    try {
      const response = await fetch("/api/generate-startup-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSlug: config.slug,
          programName: program.name,
          teamName: team?.name || "",
          participantName: participant.name || participant.code,
          ideaMemo: memo.trim(),
          previousResults,
          operation: {
            programId: program.id,
            programCode: program.programCode,
            programName: program.name,
            participantId: participant.id,
            participantCode: participant.code,
            teamId: team?.id || "",
            teamName: team?.name || "",
            role: participant.role
          }
        })
      });
      const data = (await response.json()) as { draft?: AutomatedStartupModuleDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || `${config.title} 초안을 생성하지 못했습니다.`);
      const formatted = formatStartupModuleDraft(data.draft);
      setOutput(formatted);
      await saveResult("in_progress", formatted);
      setNotice(config.completionMessage);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI 운영자료 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  if (!participants.length) {
    return (
      <section className="mt-5 border-t border-gray-200 pt-5">
        <h3 className="text-lg font-bold text-gray-950">AI 운영자료 생성</h3>
        <p className="mt-2 text-sm text-gray-600">참여자를 먼저 등록하면 멘토링 리포트와 운영자료를 생성할 수 있습니다.</p>
      </section>
    );
  }

  return (
    <section className="no-print mt-5 border-t border-gray-200 pt-5">
      <div>
        <p className="text-sm font-semibold text-blue-700">운영진 AI 도구</p>
        <h3 className="mt-1 text-xl font-bold text-gray-950">멘토링·심사·운영자료 초안 생성</h3>
        <p className="mt-1 text-sm text-gray-600">참여자별 작성 결과를 참고해 운영진 전용 산출물을 만들고 중앙 저장합니다.</p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-gray-800">
              대상 참여자
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                value={participant?.id || ""}
                onChange={(event) => {
                  setParticipantId(event.target.value);
                  setOutput("");
                }}
              >
                {participants.map((item) => (
                  <option key={item.id} value={item.id}>{item.name || item.code}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-gray-800">
              생성 자료
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                value={config?.slug || ""}
                onChange={(event) => {
                  setModuleSlug(event.target.value);
                  setOutput("");
                  setNotice("");
                }}
              >
                {adminModules.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-gray-800">
            {config?.inputLabel}
            <textarea
              className="min-h-52 rounded-md border border-gray-300 px-3 py-2 font-normal leading-6"
              placeholder={config?.inputPlaceholder}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>
          <button
            className="w-fit rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={generating || saving || !memo.trim()}
            onClick={generate}
            type="button"
          >
            {generating ? "AI 생성 중..." : config?.buttonLabel}
          </button>
        </div>
        <div className="grid content-start gap-3">
          <label className="grid gap-1 text-sm font-semibold text-gray-800">
            {config?.resultTitle}
            <textarea
              className="min-h-72 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 font-normal leading-6"
              placeholder={config?.resultPlaceholder}
              value={output}
              onChange={(event) => setOutput(event.target.value)}
            />
          </label>
          <button
            className="w-fit rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-800 disabled:opacity-50"
            disabled={saving || !output.trim()}
            onClick={() => saveResult("completed")}
            type="button"
          >
            {saving ? "저장 중..." : "최종 결과 저장"}
          </button>
        </div>
      </div>
      {notice ? <p className="mt-3 text-sm font-semibold text-blue-800">{notice}</p> : null}
      {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
