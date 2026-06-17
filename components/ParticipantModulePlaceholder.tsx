"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  HighViewOperationsState,
  OneLineIdeaDraft,
  OneLineIdeaInput,
  ParticipantModuleProgress,
  ParticipantModuleProgressStatus
} from "@/lib/types";
import {
  getParticipantVisibleModules,
  getStartupModuleBySlug,
  startupModuleCategoryLabels
} from "@/lib/startupModules";
import { defaultOperationsState, loadOperationsState, saveOperationsState } from "@/lib/operationsStorage";

const PROGRAM_SESSION_KEY = "highviewlab-participant-program-id";
const PARTICIPANT_SESSION_KEY = "highviewlab-participant-id";
const ONE_LINE_IDEA_SLUG = "one-line-idea";

function readSessionValue(key: string) {
  try {
    return window.sessionStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function statusLabel(status: ParticipantModuleProgressStatus) {
  if (status === "completed") return "완료";
  if (status === "in_progress") return "진행 중";
  if (status === "needs_review") return "검토 필요";
  return "시작 전";
}

function formatOneLineIdeaDraft(draft: OneLineIdeaDraft) {
  return [
    "대표 한 줄",
    draft.primaryOneLine,
    "",
    "대안 문장",
    ...draft.alternatives.map((item) => `- ${item}`),
    "",
    "핵심 고객",
    draft.targetCustomer,
    "",
    "해결할 문제",
    draft.problem,
    "",
    "해결 방식",
    draft.solution,
    "",
    "가치 제안",
    draft.valueProposition,
    "",
    "발표 팁",
    draft.pitchTip,
    "",
    "다음 확인 질문",
    ...draft.nextQuestions.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

export default function ParticipantModulePlaceholder({ slug }: { slug: string }) {
  const [state, setState] = useState<HighViewOperationsState>(() => defaultOperationsState());
  const [programId, setProgramId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [inputData, setInputData] = useState("");
  const [outputData, setOutputData] = useState("");
  const [notice, setNotice] = useState("");
  const [aiError, setAiError] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loaded = loadOperationsState();
    const storedProgramId = readSessionValue(PROGRAM_SESSION_KEY);
    const storedParticipantId = readSessionValue(PARTICIPANT_SESSION_KEY);
    setState(loaded);
    setProgramId(storedProgramId);
    setParticipantId(storedParticipantId);

    const participant = loaded.participants.find((item) => item.id === storedParticipantId);
    const progress = participant?.moduleProgress?.[slug];
    if (progress?.inputData) setInputData(progress.inputData);
    if (progress?.outputData) setOutputData(progress.outputData);
  }, [slug]);

  const startupModule = getStartupModuleBySlug(slug);
  const program = state.programs.find((item) => item.id === programId);
  const participant = state.participants.find((item) => item.id === participantId);
  const team = participant ? state.teams.find((item) => item.id === participant.teamId) : undefined;
  const visibleModules = getParticipantVisibleModules(program);
  const isAllowed = Boolean(startupModule && visibleModules.some((item) => item.slug === startupModule.slug));
  const progress = startupModule ? participant?.moduleProgress?.[startupModule.slug] : undefined;
  const currentStatus = progress?.status || "not_started";
  const isOneLineIdeaModule = startupModule?.slug === ONE_LINE_IDEA_SLUG;

  const saveProgress = async (
    status: ParticipantModuleProgressStatus,
    values?: { inputData?: string; outputData?: string }
  ) => {
    if (!startupModule || !participant) return;
    const now = new Date().toISOString();
    const nextInputData = values?.inputData ?? inputData;
    const nextOutputData = values?.outputData ?? outputData;
    const nextProgress: ParticipantModuleProgress = {
      moduleId: startupModule.id,
      status,
      inputData: nextInputData,
      outputData: nextOutputData,
      createdAt: progress?.createdAt || now,
      updatedAt: now
    };
    const nextState: HighViewOperationsState = {
      ...state,
      participants: state.participants.map((item) =>
        item.id === participant.id
          ? {
              ...item,
              lastSeenAt: now,
              moduleProgress: {
                ...(item.moduleProgress || {}),
                [startupModule.slug]: nextProgress
              }
            }
          : item
      )
    };
    saveOperationsState(nextState);
    setState(nextState);

    if (program) {
      try {
        await fetch("/api/module-progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId: program.id,
            participantId: participant.id,
            moduleSlug: startupModule.slug,
            status,
            currentStep: status === "completed" ? 100 : status === "in_progress" ? 50 : 10,
            inputData: { text: nextInputData },
            outputData: { text: nextOutputData }
          })
        });
      } catch {
        // localStorage fallback is already saved above.
      }
    }

    setNotice(`${startupModule.title} 상태를 '${statusLabel(status)}'로 저장했습니다.`);
  };

  const copyOutput = async () => {
    const text = outputData.trim();
    if (!text) {
      setNotice("복사할 결과 메모가 없습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice("결과 메모를 클립보드에 복사했습니다.");
    } catch {
      setNotice(text);
    }
  };

  const generateOneLineIdea = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== ONE_LINE_IDEA_SLUG) return;

    const rawIdea = inputData.trim();
    if (!rawIdea) {
      setAiError("아이디어 메모를 먼저 입력해주세요.");
      return;
    }

    const requestBody: OneLineIdeaInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      rawIdea,
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
    };

    setGenerating(true);
    setAiError("");
    setNotice("AI가 한 줄 아이디어 초안을 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-one-line-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: OneLineIdeaDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "AI 초안을 생성하지 못했습니다.");
      }

      const formattedOutput = formatOneLineIdeaDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: rawIdea, outputData: formattedOutput });
      setNotice("AI 초안이 생성되었습니다. 마음에 드는 문장으로 수정한 뒤 완료로 표시하세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI 초안 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  if (!startupModule) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-10">
        <section className="w-full rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">모듈을 찾을 수 없습니다</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">등록되지 않은 모듈입니다</h1>
          <Link className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href="/participant">
            참여자 포털로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  if (!program || !participant) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-10">
        <section className="w-full rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-blue-700">참여자 확인 필요</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">먼저 참여자 포털에 입장해주세요</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            프로그램 코드와 참여자 코드로 입장해야 배정된 모듈을 확인할 수 있습니다.
          </p>
          <Link className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href="/participant">
            참여자 포털 입장
          </Link>
        </section>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-10">
        <section className="w-full rounded-lg border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-amber-800">접근할 수 없는 모듈</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">{startupModule.title}</h1>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            이 모듈은 현재 프로그램에서 운영진이 열어두지 않았습니다. 필요한 경우 운영진에게 문의해주세요.
          </p>
          <Link className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href="/participant">
            내 모듈 목록 보기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <header className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              STEP {startupModule.order} · {startupModuleCategoryLabels[startupModule.category]}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-950">{startupModule.title}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">{startupModule.description}</p>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">
            {statusLabel(currentStatus)}
          </span>
        </div>
      </header>

      {notice ? (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</p>
      ) : null}

      {aiError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {aiError} 입력 내용을 조금 더 적은 뒤 다시 생성할 수 있습니다.
        </p>
      ) : null}

      {progress?.adminComment ? (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-bold text-amber-800">운영진 검토 코멘트</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{progress.adminComment}</p>
          {progress.reviewedAt ? (
            <p className="mt-2 text-xs text-amber-800">검토 시각: {new Date(progress.reviewedAt).toLocaleString("ko-KR")}</p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">
            {isOneLineIdeaModule ? "아이디어 메모 입력" : "모듈 입력 영역"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {isOneLineIdeaModule
              ? "고객, 문제, 해결 방식이 아직 정리되지 않아도 괜찮습니다. 적어둔 메모를 바탕으로 AI가 발표용 한 줄 초안을 만듭니다."
              : "아직 AI 생성 기능은 연결하지 않았습니다. 현장에서는 이 영역에 메모를 남기고 진행 상태만 저장할 수 있습니다."}
          </p>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">
              {isOneLineIdeaModule ? "아이디어 메모" : "입력 메모"}
            </span>
            <textarea
              className="min-h-56 w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              onChange={(event) => setInputData(event.target.value)}
              placeholder={
                isOneLineIdeaModule
                  ? "예: 혼자 사업계획서를 쓰는 예비창업자가 막막할 때 질문에 답하면 한 줄 소개와 핵심 문장을 자동으로 정리해주는 서비스"
                  : "이 모듈에서 다룰 아이디어, 고객, 문제, 증거 등을 자유롭게 적어두세요."
              }
              value={inputData}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {isOneLineIdeaModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateOneLineIdea}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 한 줄 아이디어 생성"}
              </button>
            ) : null}
            <button
              className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800"
              onClick={() => saveProgress("in_progress")}
              type="button"
            >
              임시 저장
            </button>
            <button
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white"
              onClick={() => saveProgress("completed")}
              type="button"
            >
              완료로 표시
            </button>
            <button
              className="rounded-md border border-amber-200 px-4 py-2 text-sm font-bold text-amber-800"
              onClick={() => saveProgress("needs_review")}
              type="button"
            >
              검토 필요 표시
            </button>
          </div>
        </form>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">참여 정보</p>
            <dl className="mt-3 grid gap-3 text-sm">
              <div className="rounded-md bg-gray-50 p-3">
                <dt className="text-gray-500">프로그램</dt>
                <dd className="mt-1 font-semibold text-gray-950">{program.name}</dd>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <dt className="text-gray-500">참여자</dt>
                <dd className="mt-1 font-semibold text-gray-950">{participant.name || participant.code}</dd>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <dt className="text-gray-500">업데이트</dt>
                <dd className="mt-1 font-semibold text-gray-950">
                  {progress?.updatedAt ? new Date(progress.updatedAt).toLocaleString("ko-KR") : "아직 없음"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-blue-800">
              {isOneLineIdeaModule ? "AI 생성 결과 / 수정 가능" : "결과 메모"}
            </p>
            <p className="mt-2 text-sm leading-6 text-blue-950">
              {isOneLineIdeaModule
                ? "생성된 문장은 초안입니다. 발표에 맞게 직접 고친 뒤 결과 저장 또는 완료 표시를 눌러주세요."
                : "AI 생성 기능이 붙기 전까지는 직접 정리한 결과를 저장하고 복사할 수 있습니다."}
            </p>
            <textarea
              className="mt-3 min-h-40 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              onChange={(event) => setOutputData(event.target.value)}
              placeholder={
                isOneLineIdeaModule
                  ? "AI 생성 버튼을 누르면 대표 한 줄, 대안 문장, 고객/문제/해결책 정리가 여기에 표시됩니다."
                  : "모듈 수행 결과, 핵심 문장, 다음에 붙일 AI 결과 초안 등을 적어두세요."
              }
              value={outputData}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-md bg-blue-700 px-3 py-2 text-sm font-bold text-white"
                onClick={() => saveProgress("completed")}
                type="button"
              >
                결과 저장
              </button>
              <button
                className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-bold text-blue-800"
                onClick={copyOutput}
                type="button"
              >
                결과 복사
              </button>
            </div>
          </section>
          <Link className="rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-bold" href="/participant">
            모듈 목록으로 돌아가기
          </Link>
        </aside>
      </section>
    </main>
  );
}
