"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  CustomerInterviewDraft,
  CustomerInterviewInput,
  CustomerJourneyDraft,
  CustomerJourneyInput,
  CustomerPersonaDraft,
  CustomerPersonaInput,
  HighViewOperationsState,
  IdeaDiagnosisDraft,
  IdeaDiagnosisInput,
  OneLineIdeaDraft,
  OneLineIdeaInput,
  ParticipantModuleProgress,
  ParticipantModuleProgressStatus,
  ProblemStatementDraft,
  ProblemStatementInput
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
const IDEA_DIAGNOSIS_SLUG = "idea-diagnosis";
const CUSTOMER_PERSONA_SLUG = "customer-persona";
const CUSTOMER_JOURNEY_SLUG = "customer-journey-map";
const PROBLEM_STATEMENT_SLUG = "problem-statement";
const CUSTOMER_INTERVIEW_SLUG = "customer-interview-questions";

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

function formatDiagnosisScore(label: string, score: IdeaDiagnosisDraft["problemFit"]) {
  return [`${label}: ${score.score}점`, `- 이유: ${score.reason}`, `- 보완: ${score.improvement}`].join("\n");
}

function formatIdeaDiagnosisDraft(draft: IdeaDiagnosisDraft) {
  return [
    `종합 진단: ${draft.overallScore}점`,
    draft.summary,
    "",
    formatDiagnosisScore("문제성", draft.problemFit),
    "",
    formatDiagnosisScore("고객성", draft.customerFit),
    "",
    formatDiagnosisScore("시장성", draft.marketFit),
    "",
    formatDiagnosisScore("실현가능성", draft.feasibility),
    "",
    "강점",
    ...draft.strengths.map((item) => `- ${item}`),
    "",
    "위험요소",
    ...draft.risks.map((item) => `- ${item}`),
    "",
    "다음 액션",
    ...draft.nextActions.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

function formatCustomerPersonaDraft(draft: CustomerPersonaDraft) {
  return [
    "대표 페르소나",
    draft.personaName,
    "",
    "한 문장 요약",
    draft.personaSummary,
    "",
    "기본 특성",
    draft.demographic,
    "",
    "문제를 겪는 상황",
    draft.situation,
    "",
    "해결하려는 일",
    draft.jobToBeDone,
    "",
    "핵심 고통점",
    ...draft.painPoints.map((item) => `- ${item}`),
    "",
    "현재 대안",
    ...draft.currentAlternatives.map((item) => `- ${item}`),
    "",
    "사용/구매 계기",
    ...draft.buyingTriggers.map((item) => `- ${item}`),
    "",
    "망설이는 이유",
    ...draft.objections.map((item) => `- ${item}`),
    "",
    "만날 수 있는 채널",
    ...draft.channels.map((item) => `- ${item}`),
    "",
    "고객 인터뷰 질문",
    ...draft.interviewQuestions.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

function formatCustomerJourneyDraft(draft: CustomerJourneyDraft) {
  return [
    "기준 페르소나",
    draft.personaSummary,
    "",
    "대표 시나리오",
    draft.journeyScenario,
    "",
    "고객 여정 단계",
    ...draft.journeySteps.flatMap((step, index) => [
      `${index + 1}. ${step.stage}`,
      `- 행동: ${step.customerAction}`,
      `- 접점: ${step.touchpoint}`,
      `- 감정: ${step.emotion}`,
      `- 고통점: ${step.painPoint}`,
      `- 기회: ${step.opportunity}`,
      ""
    ]),
    "가장 고통이 큰 순간",
    draft.highestPainMoment,
    "",
    "서비스 기회",
    ...draft.serviceOpportunities.map((item) => `- ${item}`),
    "",
    "검증 질문",
    ...draft.validationQuestions.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

function formatProblemStatementDraft(draft: ProblemStatementDraft) {
  return [
    "문제정의문",
    draft.problemStatement,
    "",
    "가장 먼저 검증할 고객",
    draft.targetCustomer,
    "",
    "문제가 발생하는 상황",
    draft.situation,
    "",
    "핵심 고통",
    draft.painPoint,
    "",
    "반복되는 근본 원인",
    draft.rootCause,
    "",
    "현재 대안과 한계",
    draft.currentAlternative,
    "",
    "확인해야 할 증거",
    ...draft.evidenceNeeded.map((item) => `- ${item}`),
    "",
    "발표에 바로 쓸 문장",
    ...draft.presentationSentences.map((item) => `- ${item}`),
    "",
    "고객 검증 질문",
    ...draft.validationQuestions.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

function formatInterviewQuestionGroup(title: string, questions: CustomerInterviewDraft["screeningQuestions"]) {
  return [
    title,
    ...questions.flatMap((item, index) => [
      `${index + 1}. ${item.question}`,
      `- 의도: ${item.intent}`,
      `- 꼬리질문: ${item.followUp}`,
      ""
    ])
  ];
}

function formatCustomerInterviewDraft(draft: CustomerInterviewDraft) {
  return [
    "인터뷰 목표",
    draft.interviewGoal,
    "",
    "인터뷰 대상 고객",
    draft.targetCustomer,
    "",
    "오프닝 멘트",
    draft.openingScript,
    "",
    ...formatInterviewQuestionGroup("선별 질문", draft.screeningQuestions),
    ...formatInterviewQuestionGroup("가벼운 시작 질문", draft.warmupQuestions),
    ...formatInterviewQuestionGroup("문제 발견 질문", draft.problemDiscoveryQuestions),
    ...formatInterviewQuestionGroup("현재 대안 질문", draft.currentAlternativeQuestions),
    ...formatInterviewQuestionGroup("지불의사 질문", draft.willingnessToPayQuestions),
    ...formatInterviewQuestionGroup("마무리 질문", draft.closingQuestions),
    "피해야 할 질문",
    ...draft.avoidQuestions.map((item) => `- ${item}`),
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
  const isIdeaDiagnosisModule = startupModule?.slug === IDEA_DIAGNOSIS_SLUG;
  const isCustomerPersonaModule = startupModule?.slug === CUSTOMER_PERSONA_SLUG;
  const isCustomerJourneyModule = startupModule?.slug === CUSTOMER_JOURNEY_SLUG;
  const isProblemStatementModule = startupModule?.slug === PROBLEM_STATEMENT_SLUG;
  const isCustomerInterviewModule = startupModule?.slug === CUSTOMER_INTERVIEW_SLUG;
  const oneLineIdeaOutput = participant?.moduleProgress?.[ONE_LINE_IDEA_SLUG]?.outputData || "";
  const ideaDiagnosisOutput = participant?.moduleProgress?.[IDEA_DIAGNOSIS_SLUG]?.outputData || "";
  const customerPersonaOutput = participant?.moduleProgress?.[CUSTOMER_PERSONA_SLUG]?.outputData || "";
  const customerJourneyOutput = participant?.moduleProgress?.[CUSTOMER_JOURNEY_SLUG]?.outputData || "";
  const problemStatementOutput = participant?.moduleProgress?.[PROBLEM_STATEMENT_SLUG]?.outputData || "";

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

  const generateIdeaDiagnosis = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== IDEA_DIAGNOSIS_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("진단할 아이디어 내용을 먼저 입력해주세요.");
      return;
    }

    const requestBody: IdeaDiagnosisInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
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
    setNotice("AI가 아이디어 사전진단 리포트를 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-idea-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: IdeaDiagnosisDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "사전진단 리포트를 생성하지 못했습니다.");
      }

      const formattedOutput = formatIdeaDiagnosisDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("사전진단 리포트가 생성되었습니다. 점수와 보완 액션을 확인한 뒤 완료로 표시하세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "사전진단 리포트 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateCustomerPersona = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== CUSTOMER_PERSONA_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("페르소나를 만들 아이디어 내용을 먼저 입력해주세요.");
      return;
    }

    const requestBody: CustomerPersonaInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
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
    setNotice("AI가 핵심 고객 페르소나를 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-customer-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: CustomerPersonaDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "고객 페르소나를 생성하지 못했습니다.");
      }

      const formattedOutput = formatCustomerPersonaDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("고객 페르소나가 생성되었습니다. 실제 인터뷰 가능한 고객인지 확인한 뒤 완료로 표시하세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "고객 페르소나 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateCustomerJourney = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== CUSTOMER_JOURNEY_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("여정지도를 만들 고객 상황을 먼저 입력해주세요.");
      return;
    }

    const requestBody: CustomerJourneyInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
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
    setNotice("AI가 고객 여정지도를 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-customer-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: CustomerJourneyDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "고객 여정지도를 생성하지 못했습니다.");
      }

      const formattedOutput = formatCustomerJourneyDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("고객 여정지도가 생성되었습니다. 가장 고통이 큰 순간과 서비스 기회를 확인한 뒤 완료로 표시하세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "고객 여정지도 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateProblemStatement = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== PROBLEM_STATEMENT_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("문제정의문을 만들 고객 문제 메모를 먼저 입력해주세요.");
      return;
    }

    const requestBody: ProblemStatementInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      journeyReport: customerJourneyOutput,
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
    setNotice("AI가 발표용 문제정의문을 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-problem-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: ProblemStatementDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "문제정의문을 생성하지 못했습니다.");
      }

      const formattedOutput = formatProblemStatementDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("문제정의문이 생성되었습니다. 실제 고객에게 검증 가능한 문장인지 확인한 뒤 완료로 표시해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "문제정의문 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateCustomerInterview = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== CUSTOMER_INTERVIEW_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("고객 인터뷰 질문지를 만들 문제 메모를 먼저 입력해주세요.");
      return;
    }

    const requestBody: CustomerInterviewInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      journeyReport: customerJourneyOutput,
      problemStatementReport: problemStatementOutput,
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
    setNotice("AI가 고객 인터뷰 질문지를 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-customer-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: CustomerInterviewDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "고객 인터뷰 질문지를 생성하지 못했습니다.");
      }

      const formattedOutput = formatCustomerInterviewDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("고객 인터뷰 질문지가 생성되었습니다. 유도질문을 줄이고 최근 실제 경험을 묻는지 확인한 뒤 완료로 표시해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "고객 인터뷰 질문지 생성 중 오류가 발생했습니다.");
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

  const inputTitle = isOneLineIdeaModule
    ? "아이디어 메모 입력"
    : isIdeaDiagnosisModule
      ? "진단할 아이디어 입력"
      : isCustomerPersonaModule
        ? "페르소나를 만들 아이디어 입력"
        : isCustomerJourneyModule
          ? "고객 여정 상황 입력"
          : "모듈 입력 영역";
  const inputDescription = isOneLineIdeaModule
    ? "고객, 문제, 해결 방식이 아직 정리되지 않아도 괜찮습니다. 적어둔 메모를 바탕으로 AI가 발표용 한 줄 초안을 만듭니다."
    : isIdeaDiagnosisModule
      ? "아이디어의 고객, 문제, 해결 방식, 현재 걱정되는 부분을 적어주세요. AI가 문제성·고객성·시장성·실현가능성을 진단합니다."
      : isCustomerPersonaModule
        ? "아이디어를 사용할 가능성이 가장 높은 고객을 떠올려 적어주세요. AI가 실제 인터뷰할 수 있는 한 명의 페르소나로 좁혀줍니다."
        : isCustomerJourneyModule
          ? "고객이 문제를 느끼고 대안을 찾고 선택하기까지의 흐름을 적어주세요. AI가 단계별 행동·접점·감정·고통·기회를 정리합니다."
          : "아직 AI 생성 기능은 연결하지 않았습니다. 현장에서는 이 영역에 메모를 남기고 진행 상태만 저장할 수 있습니다.";
  const inputLabel = isOneLineIdeaModule
    ? "아이디어 메모"
    : isIdeaDiagnosisModule
      ? "진단 메모"
      : isCustomerPersonaModule
        ? "고객·상황 메모"
        : isCustomerJourneyModule
          ? "고객 여정 메모"
          : "입력 메모";
  const inputPlaceholder = isOneLineIdeaModule
    ? "예: 혼자 사업계획서를 쓰는 예비창업자가 막막할 때 질문에 답하면 한 줄 소개와 핵심 문장을 자동으로 정리해주는 서비스"
    : isIdeaDiagnosisModule
      ? "예: 자취생에게 국밥을 자동으로 조리해주는 기계입니다. 고객은 혼자 사는 대학생이고, 늦은 시간 따뜻한 한 끼를 쉽게 먹지 못하는 문제를 해결하고 싶습니다."
      : isCustomerPersonaModule
        ? "예: 늦은 밤 편의점 음식으로 끼니를 때우는 자취 대학생. 따뜻한 국밥을 먹고 싶지만 배달비와 조리 시간이 부담스럽다."
        : isCustomerJourneyModule
          ? "예: 밤 11시에 공부를 마친 자취생이 따뜻한 식사를 찾는다. 배달앱을 열지만 배달비가 부담되고, 편의점 음식은 질려서 고민한다."
          : "이 모듈에서 다룰 아이디어, 고객, 문제, 증거 등을 자유롭게 적어두세요.";
  const resultTitle = isOneLineIdeaModule
    ? "AI 생성 결과 / 수정 가능"
    : isIdeaDiagnosisModule
      ? "AI 사전진단 리포트 / 수정 가능"
      : isCustomerPersonaModule
        ? "AI 고객 페르소나 / 수정 가능"
        : isCustomerJourneyModule
          ? "AI 고객 여정지도 / 수정 가능"
          : "결과 메모";
  const resultDescription = isOneLineIdeaModule
    ? "생성된 문장은 초안입니다. 발표에 맞게 직접 고친 뒤 결과 저장 또는 완료 표시를 눌러주세요."
    : isIdeaDiagnosisModule
      ? "점수는 초안입니다. 현장 멘토링 내용에 맞게 이유와 다음 액션을 직접 수정할 수 있습니다."
      : isCustomerPersonaModule
        ? "페르소나는 초안입니다. 실제 만날 수 있는 고객으로 더 좁히고, 인터뷰 질문을 현장에 맞게 수정하세요."
        : isCustomerJourneyModule
          ? "여정지도는 초안입니다. 실제 고객 인터뷰에서 확인한 행동과 접점으로 수정하면 더 강해집니다."
          : "AI 생성 기능이 붙기 전까지는 직접 정리한 결과를 저장하고 복사할 수 있습니다.";
  const resultPlaceholder = isOneLineIdeaModule
    ? "AI 생성 버튼을 누르면 대표 한 줄, 대안 문장, 고객/문제/해결책 정리가 여기에 표시됩니다."
    : isIdeaDiagnosisModule
      ? "AI 진단 버튼을 누르면 종합 점수, 4개 진단 항목, 강점, 위험요소, 다음 액션이 여기에 표시됩니다."
      : isCustomerPersonaModule
        ? "AI 생성 버튼을 누르면 대표 페르소나, 고통점, 현재 대안, 사용 계기, 인터뷰 질문이 여기에 표시됩니다."
        : isCustomerJourneyModule
          ? "AI 생성 버튼을 누르면 여정 단계, 고객 행동, 접점, 감정, 고통점, 서비스 기회가 여기에 표시됩니다."
          : "모듈 수행 결과, 핵심 문장, 다음에 붙일 AI 결과 초안 등을 적어두세요.";

  const moduleCopyOverride = isProblemStatementModule
    ? {
        inputTitle: "문제정의 메모 입력",
        inputDescription:
          "고객이 어떤 상황에서 어떤 불편을 겪는지 적어주세요. 앞선 모듈 결과가 있다면 함께 참고해 발표용 문제정의문으로 정리합니다.",
        inputLabel: "고객 문제 메모",
        inputPlaceholder:
          "예: 밤늦게 공부를 마친 자취생은 따뜻한 식사를 원하지만 배달비가 부담되고 편의점 음식은 질려서 만족스러운 대안을 찾기 어렵다.",
        resultTitle: "AI 문제정의문 / 수정 가능",
        resultDescription:
          "문제정의문은 해결책 홍보 문장이 아니라 고객 인터뷰로 검증할 수 있는 문장이어야 합니다. 표현을 팀 발표 톤에 맞게 수정하세요.",
        resultPlaceholder:
          "AI 생성 버튼을 누르면 문제정의문, 고객, 상황, 고통, 근본 원인, 기존 대안의 한계, 검증 질문이 여기에 표시됩니다."
      }
    : isCustomerInterviewModule
      ? {
          inputTitle: "고객 인터뷰 메모 입력",
          inputDescription:
            "인터뷰로 확인하고 싶은 고객 문제를 적어주세요. 문제정의문 결과가 있으면 함께 참고해 선별 질문, 문제 발견 질문, 현재 대안 질문으로 정리합니다.",
          inputLabel: "인터뷰 준비 메모",
          inputPlaceholder:
            "예: 밤늦게 식사를 해결해야 하는 자취생이 실제로 배달비, 시간, 대안 부족 때문에 불편을 겪는지 확인하고 싶다.",
          resultTitle: "AI 고객 인터뷰 질문지 / 수정 가능",
          resultDescription:
            "질문지는 고객의 최근 실제 행동을 확인하는 초안입니다. 해결책을 설명하거나 구매를 유도하는 질문은 삭제하고 현장 말투로 다듬으세요.",
          resultPlaceholder:
            "AI 생성 버튼을 누르면 인터뷰 목표, 오프닝 멘트, 선별 질문, 문제 발견 질문, 현재 대안 질문, 지불의사 질문, 피해야 할 질문이 표시됩니다."
        }
      : null;
  const displayInputTitle = moduleCopyOverride?.inputTitle || inputTitle;
  const displayInputDescription = moduleCopyOverride?.inputDescription || inputDescription;
  const displayInputLabel = moduleCopyOverride?.inputLabel || inputLabel;
  const displayInputPlaceholder = moduleCopyOverride?.inputPlaceholder || inputPlaceholder;
  const displayResultTitle = moduleCopyOverride?.resultTitle || resultTitle;
  const displayResultDescription = moduleCopyOverride?.resultDescription || resultDescription;
  const displayResultPlaceholder = moduleCopyOverride?.resultPlaceholder || resultPlaceholder;

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
          <h2 className="text-lg font-bold text-gray-950">{displayInputTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{displayInputDescription}</p>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">{displayInputLabel}</span>
            <textarea
              className="min-h-56 w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              onChange={(event) => setInputData(event.target.value)}
              placeholder={displayInputPlaceholder}
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
            {isIdeaDiagnosisModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateIdeaDiagnosis}
                type="button"
              >
                {generating ? "AI 진단 중..." : "AI 사전진단 리포트 생성"}
              </button>
            ) : null}
            {isCustomerPersonaModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateCustomerPersona}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 고객 페르소나 생성"}
              </button>
            ) : null}
            {isCustomerJourneyModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateCustomerJourney}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 고객 여정지도 생성"}
              </button>
            ) : null}
            {isProblemStatementModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateProblemStatement}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 문제정의문 생성"}
              </button>
            ) : null}
            {isCustomerInterviewModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateCustomerInterview}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 고객 인터뷰 질문지 생성"}
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
            <p className="text-sm font-bold text-blue-800">{displayResultTitle}</p>
            <p className="mt-2 text-sm leading-6 text-blue-950">{displayResultDescription}</p>
            <textarea
              className="mt-3 min-h-40 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              onChange={(event) => setOutputData(event.target.value)}
              placeholder={displayResultPlaceholder}
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
