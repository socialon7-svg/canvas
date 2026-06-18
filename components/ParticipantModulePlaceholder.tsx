"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  BusinessModelDraft,
  BusinessModelInput,
  CompetitorAnalysisDraft,
  CompetitorAnalysisInput,
  CustomerInterviewDraft,
  CustomerInterviewInput,
  CustomerJourneyDraft,
  CustomerJourneyInput,
  CustomerPersonaDraft,
  CustomerPersonaInput,
  CustomerSurveyDraft,
  CustomerSurveyInput,
  DifferentiationStrategyDraft,
  DifferentiationStrategyInput,
  HighViewOperationsState,
  IdeaDiagnosisDraft,
  IdeaDiagnosisInput,
  MarketResearchDraft,
  MarketResearchInput,
  OneLineIdeaDraft,
  OneLineIdeaInput,
  ParticipantModuleProgress,
  ParticipantModuleProgressStatus,
  PricingPolicyDraft,
  PricingPolicyInput,
  ProblemStatementDraft,
  ProblemStatementInput,
  ValidationExperimentDraft,
  ValidationExperimentInput
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
const CUSTOMER_SURVEY_SLUG = "survey-generator";
const VALIDATION_EXPERIMENT_SLUG = "validation-experiment";
const MARKET_RESEARCH_SLUG = "market-research-report";
const COMPETITOR_ANALYSIS_SLUG = "competitor-analysis";
const DIFFERENTIATION_STRATEGY_SLUG = "differentiation-strategy";
const BUSINESS_MODEL_SLUG = "business-model";
const PRICING_POLICY_SLUG = "pricing-policy";

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

function formatSurveyQuestionGroup(title: string, questions: CustomerSurveyDraft["screeningQuestions"]) {
  return [
    title,
    ...questions.flatMap((item, index) => [
      `${index + 1}. [${item.type}] ${item.question}`,
      `- 목적: ${item.purpose}`,
      `- 필수: ${item.required ? "예" : "아니오"}`,
      `- 선택지: ${item.options.length ? item.options.join(" / ") : "주관식"}`,
      ""
    ])
  ];
}

function formatCustomerSurveyDraft(draft: CustomerSurveyDraft) {
  return [
    "설문 목표",
    draft.surveyGoal,
    "",
    "응답 대상",
    draft.targetRespondent,
    "",
    "설문 안내문",
    draft.introMessage,
    "",
    "예상 소요 시간",
    draft.estimatedTime,
    "",
    ...formatSurveyQuestionGroup("선별 문항", draft.screeningQuestions),
    ...formatSurveyQuestionGroup("문제 검증 문항", draft.problemValidationQuestions),
    ...formatSurveyQuestionGroup("현재 대안 문항", draft.currentAlternativeQuestions),
    ...formatSurveyQuestionGroup("지불의사 문항", draft.willingnessToPayQuestions),
    ...formatSurveyQuestionGroup("응답자 특성 문항", draft.demographicQuestions),
    "분석 기준",
    ...draft.analysisGuide.map((item) => `- ${item}`),
    "",
    "설문 작성 주의사항",
    ...draft.avoidNotes.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

function formatValidationExperimentDraft(draft: ValidationExperimentDraft) {
  return [
    "실험 목표",
    draft.experimentGoal,
    "",
    "가장 위험한 가정",
    draft.riskiestAssumption,
    "",
    "검증 가설",
    draft.hypothesis,
    "",
    "실험 유형",
    draft.experimentType,
    "",
    "대상 고객",
    draft.targetCustomer,
    "",
    "모집 계획",
    draft.samplePlan,
    "",
    "실험 실행 단계",
    ...draft.methodSteps.flatMap((item, index) => [
      `${index + 1}. ${item.step}`,
      `- 실행: ${item.action}`,
      `- 도구: ${item.tool}`,
      `- 산출물: ${item.expectedOutput}`,
      ""
    ]),
    "수집할 데이터",
    ...draft.dataToCollect.map((item) => `- ${item}`),
    "",
    "성공 기준",
    ...draft.successCriteria.map((item) => `- ${item}`),
    "",
    "실패 기준",
    ...draft.failureCriteria.map((item) => `- ${item}`),
    "",
    "준비물",
    ...draft.requiredMaterials.map((item) => `- ${item}`),
    "",
    "실행 일정",
    draft.schedule,
    "",
    "주의사항",
    ...draft.riskControls.map((item) => `- ${item}`),
    "",
    "오늘 바로 할 일",
    draft.nextAction,
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}

function formatMarketResearchDraft(draft: MarketResearchDraft) {
  return [
    "조사 목표", draft.researchGoal, "",
    "초기 목표 시장", draft.targetMarket, "",
    "시장 정의", draft.marketDefinition, "",
    "핵심 고객", draft.coreCustomer, "",
    "시장 신호", ...draft.marketSignals.map((item) => `- ${item}`), "",
    "수요 증거", ...draft.demandEvidence.map((item) => `- ${item}`), "",
    "시장 규모 가정",
    ...draft.marketSizeEstimates.flatMap((item) => [
      `${item.label}: ${item.value}`,
      `- 산식: ${item.basis}`,
      `- 신뢰도: ${item.confidence}`,
      ""
    ]),
    "출처 확인 계획",
    ...draft.sourcePlan.flatMap((item, index) => [
      `${index + 1}. ${item.source}`,
      `- 검색어: ${item.searchQuery}`,
      `- 확인 목적: ${item.purpose}`,
      ""
    ]),
    "현장 조사 계획", ...draft.fieldResearchPlan.map((item) => `- ${item}`), "",
    "해석 주의사항", ...draft.risks.map((item) => `- ${item}`), "",
    "오늘 바로 할 일", draft.nextAction, "",
    "멘토 코멘트", draft.mentorComment
  ].join("\n");
}

function formatCompetitorAnalysisDraft(draft: CompetitorAnalysisDraft) {
  return [
    "분석 목표", draft.analysisGoal, "",
    "비교 범위", draft.comparisonFrame, "",
    "고객 선택 기준", ...draft.customerChoiceCriteria.map((item) => `- ${item}`), "",
    "경쟁사·대안 비교",
    ...draft.competitors.flatMap((item, index) => [
      `${index + 1}. ${item.name} [${item.type}]`,
      `- 대상 고객: ${item.targetCustomer}`,
      `- 제공 가치: ${item.mainOffer}`,
      `- 가격 수준: ${item.priceLevel}`,
      `- 강점: ${item.strength}`,
      `- 약점: ${item.weakness}`,
      `- 근거 상태: ${item.evidenceStatus}`,
      ""
    ]),
    "비교 요약", ...draft.comparisonSummary.map((item) => `- ${item}`), "",
    "비어 있는 기회", ...draft.opportunityGaps.map((item) => `- ${item}`), "",
    "추가 확인 과제", ...draft.validationTasks.map((item) => `- ${item}`), "",
    "멘토 코멘트", draft.mentorComment
  ].join("\n");
}

function formatDifferentiationStrategyDraft(draft: DifferentiationStrategyDraft) {
  return [
    "전략 목표", draft.strategyGoal, "",
    "핵심 고객", draft.targetCustomer, "",
    "핵심 문제", draft.customerProblem, "",
    "경쟁 구도", draft.competitiveFrame, "",
    "가장 강한 차별점", draft.strongestDifferentiator, "",
    "고객에게 중요한 이유", draft.whyItMatters, "",
    "포지셔닝 문장", draft.positioningStatement, "",
    "차별점 증거", ...draft.proofPoints.map((item) => `- ${item}`), "",
    "실행 요소", ...draft.deliveryActions.map((item) => `- ${item}`), "",
    "방어력 계획", ...draft.defensibilityPlan.map((item) => `- ${item}`), "",
    "피해야 할 주장", ...draft.avoidClaims.map((item) => `- ${item}`), "",
    "메시지 후보", ...draft.messageOptions.map((item) => `- ${item}`), "",
    "다음 행동", ...draft.nextActions.map((item) => `- ${item}`), "",
    "멘토 코멘트", draft.mentorComment
  ].join("\n");
}

function formatBusinessModelDraft(draft: BusinessModelDraft) {
  return [
    "사업모델 목표", draft.businessModelGoal, "",
    "핵심 고객", draft.coreCustomer, "",
    "수혜자", draft.beneficiary, "",
    "지불자", draft.payer, "",
    "가치 교환", draft.valueExchange, "",
    "수익원",
    ...draft.revenueStreams.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `- 지불자: ${item.payer}`,
      `- 제공 가치: ${item.valueDelivered}`,
      `- 과금 기준: ${item.chargeBasis}`,
      `- 결제 시점: ${item.paymentTiming}`,
      `- 검증 방법: ${item.validationMethod}`,
      ""
    ]),
    "핵심 비용", ...draft.keyCosts.map((item) => `- ${item}`), "",
    "단위경제 가정", ...draft.unitEconomicsAssumptions.map((item) => `- ${item}`), "",
    "고객 획득 경로", ...draft.acquisitionPaths.map((item) => `- ${item}`), "",
    "운영 파트너", ...draft.operatingPartners.map((item) => `- ${item}`), "",
    "주요 위험", ...draft.risks.map((item) => `- ${item}`), "",
    "검증 계획", ...draft.validationPlan.map((item) => `- ${item}`), "",
    "오늘 바로 할 일", draft.nextAction, "",
    "멘토 코멘트", draft.mentorComment
  ].join("\n");
}

function formatPricingPolicyDraft(draft: PricingPolicyDraft) {
  return [
    "가격정책 목표", draft.pricingGoal, "",
    "가격 원칙", draft.pricingPrinciple, "",
    "비교할 현재 대안", ...draft.referenceAlternatives.map((item) => `- ${item}`), "",
    "가격 패키지",
    ...draft.packages.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `- 대상 고객: ${item.targetCustomer}`,
      `- 가격 제안: ${item.priceProposal}`,
      `- 포함 범위: ${item.included}`,
      `- 이용 한도: ${item.limit}`,
      `- 패키지 역할: ${item.purpose}`,
      `- 검증 방법: ${item.validationMethod}`,
      ""
    ]),
    "할인 규칙", ...draft.discountRules.map((item) => `- ${item}`), "",
    "환불 규칙", ...draft.refundRules.map((item) => `- ${item}`), "",
    "가격 실험", ...draft.pricingExperiments.map((item) => `- ${item}`), "",
    "확인 지표", ...draft.metrics.map((item) => `- ${item}`), "",
    "가격 위험", ...draft.risks.map((item) => `- ${item}`), "",
    "오늘 바로 할 일", draft.nextAction, "",
    "멘토 코멘트", draft.mentorComment
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
  const isCustomerSurveyModule = startupModule?.slug === CUSTOMER_SURVEY_SLUG;
  const isValidationExperimentModule = startupModule?.slug === VALIDATION_EXPERIMENT_SLUG;
  const isMarketResearchModule = startupModule?.slug === MARKET_RESEARCH_SLUG;
  const isCompetitorAnalysisModule = startupModule?.slug === COMPETITOR_ANALYSIS_SLUG;
  const isDifferentiationStrategyModule = startupModule?.slug === DIFFERENTIATION_STRATEGY_SLUG;
  const isBusinessModelModule = startupModule?.slug === BUSINESS_MODEL_SLUG;
  const isPricingPolicyModule = startupModule?.slug === PRICING_POLICY_SLUG;
  const oneLineIdeaOutput = participant?.moduleProgress?.[ONE_LINE_IDEA_SLUG]?.outputData || "";
  const ideaDiagnosisOutput = participant?.moduleProgress?.[IDEA_DIAGNOSIS_SLUG]?.outputData || "";
  const customerPersonaOutput = participant?.moduleProgress?.[CUSTOMER_PERSONA_SLUG]?.outputData || "";
  const customerJourneyOutput = participant?.moduleProgress?.[CUSTOMER_JOURNEY_SLUG]?.outputData || "";
  const problemStatementOutput = participant?.moduleProgress?.[PROBLEM_STATEMENT_SLUG]?.outputData || "";
  const customerInterviewOutput = participant?.moduleProgress?.[CUSTOMER_INTERVIEW_SLUG]?.outputData || "";
  const customerSurveyOutput = participant?.moduleProgress?.[CUSTOMER_SURVEY_SLUG]?.outputData || "";
  const validationExperimentOutput = participant?.moduleProgress?.[VALIDATION_EXPERIMENT_SLUG]?.outputData || "";
  const marketResearchOutput = participant?.moduleProgress?.[MARKET_RESEARCH_SLUG]?.outputData || "";
  const competitorAnalysisOutput = participant?.moduleProgress?.[COMPETITOR_ANALYSIS_SLUG]?.outputData || "";
  const differentiationStrategyOutput = participant?.moduleProgress?.[DIFFERENTIATION_STRATEGY_SLUG]?.outputData || "";
  const businessModelOutput = participant?.moduleProgress?.[BUSINESS_MODEL_SLUG]?.outputData || "";

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

  const generateCustomerSurvey = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== CUSTOMER_SURVEY_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("고객 검증 설문지를 만들 문제 메모를 먼저 입력해주세요.");
      return;
    }

    const requestBody: CustomerSurveyInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      journeyReport: customerJourneyOutput,
      problemStatementReport: problemStatementOutput,
      interviewReport: customerInterviewOutput,
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
    setNotice("AI가 고객 검증 설문지를 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: CustomerSurveyDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "고객 검증 설문지를 생성하지 못했습니다.");
      }

      const formattedOutput = formatCustomerSurveyDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("고객 검증 설문지가 생성되었습니다. 선택지가 편향되지 않았는지 확인한 뒤 완료로 표시해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "고객 검증 설문지 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateValidationExperiment = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== VALIDATION_EXPERIMENT_SLUG) return;

    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError("검증 실험을 만들 고객 문제 메모를 먼저 입력해주세요.");
      return;
    }

    const requestBody: ValidationExperimentInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      journeyReport: customerJourneyOutput,
      problemStatementReport: problemStatementOutput,
      interviewReport: customerInterviewOutput,
      surveyReport: customerSurveyOutput,
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
    setNotice("AI가 검증 실험 설계안을 생성하고 있습니다.");

    try {
      const response = await fetch("/api/generate-validation-experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: ValidationExperimentDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "검증 실험 설계안을 생성하지 못했습니다.");
      }

      const formattedOutput = formatValidationExperimentDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("검증 실험 설계안이 생성되었습니다. 성공 기준이 숫자로 측정 가능한지 확인한 뒤 완료로 표시해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "검증 실험 설계안 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const operationContext = program && participant
    ? {
        programId: program.id,
        programCode: program.programCode,
        programName: program.name,
        participantId: participant.id,
        participantCode: participant.code,
        teamId: team?.id || "",
        teamName: team?.name || "",
        role: participant.role
      }
    : undefined;

  const generateMarketResearch = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== MARKET_RESEARCH_SLUG) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) return setAiError("시장조사 메모를 먼저 입력해주세요.");
    const requestBody: MarketResearchInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      problemStatementReport: problemStatementOutput,
      validationExperimentReport: validationExperimentOutput,
      operation: operationContext
    };
    setGenerating(true);
    setAiError("");
    setNotice("AI가 시장조사 리포트 초안을 생성하고 있습니다.");
    try {
      const response = await fetch("/api/generate-market-research", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: MarketResearchDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "시장조사 리포트를 생성하지 못했습니다.");
      const formattedOutput = formatMarketResearchDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("시장조사 초안이 생성되었습니다. '확인 필요' 숫자는 제시된 출처에서 직접 확인해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "시장조사 리포트 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateCompetitorAnalysis = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== COMPETITOR_ANALYSIS_SLUG) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) return setAiError("경쟁사 분석 메모를 먼저 입력해주세요.");
    const requestBody: CompetitorAnalysisInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      problemStatementReport: problemStatementOutput,
      validationExperimentReport: validationExperimentOutput,
      marketResearchReport: marketResearchOutput,
      operation: operationContext
    };
    setGenerating(true);
    setAiError("");
    setNotice("AI가 경쟁사와 현재 대안을 비교하고 있습니다.");
    try {
      const response = await fetch("/api/generate-competitor-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: CompetitorAnalysisDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "경쟁사 분석표를 생성하지 못했습니다.");
      const formattedOutput = formatCompetitorAnalysisDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("경쟁사 분석표가 생성되었습니다. 가격과 기능은 근거 상태를 확인한 뒤 수정해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "경쟁사 분석표 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateDifferentiationStrategy = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== DIFFERENTIATION_STRATEGY_SLUG) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) return setAiError("차별화 전략 메모를 먼저 입력해주세요.");
    const requestBody: DifferentiationStrategyInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      problemStatementReport: problemStatementOutput,
      validationExperimentReport: validationExperimentOutput,
      marketResearchReport: marketResearchOutput,
      competitorAnalysisReport: competitorAnalysisOutput,
      operation: operationContext
    };
    setGenerating(true);
    setAiError("");
    setNotice("AI가 가장 강한 차별점 한 가지를 정리하고 있습니다.");
    try {
      const response = await fetch("/api/generate-differentiation-strategy", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: DifferentiationStrategyDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "차별화 전략을 생성하지 못했습니다.");
      const formattedOutput = formatDifferentiationStrategyDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("차별화 전략이 생성되었습니다. 차별점이 고객 선택 행동으로 이어지는지 다음 액션으로 검증해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "차별화 전략 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateBusinessModel = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== BUSINESS_MODEL_SLUG) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) return setAiError("사업모델 메모를 먼저 입력해주세요.");
    const requestBody: BusinessModelInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      problemStatementReport: problemStatementOutput,
      validationExperimentReport: validationExperimentOutput,
      marketResearchReport: marketResearchOutput,
      competitorAnalysisReport: competitorAnalysisOutput,
      differentiationStrategyReport: differentiationStrategyOutput,
      operation: operationContext
    };
    setGenerating(true);
    setAiError("");
    setNotice("AI가 고객, 지불자, 수익원과 비용 가정을 정리하고 있습니다.");
    try {
      const response = await fetch("/api/generate-business-model", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: BusinessModelDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "사업모델 초안을 생성하지 못했습니다.");
      const formattedOutput = formatBusinessModelDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("사업모델 초안이 생성되었습니다. 수익원 하나를 골라 실제 결제 행동으로 먼저 검증해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "사업모델 생성 중 오류가 발생했습니다.");
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generatePricingPolicy = async () => {
    if (!program || !participant || !startupModule || startupModule.slug !== PRICING_POLICY_SLUG) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) return setAiError("가격정책 메모를 먼저 입력해주세요.");
    const requestBody: PricingPolicyInput = {
      programName: program.name,
      teamName: team?.name || "",
      participantName: participant.name || participant.code,
      ideaMemo,
      oneLineIdea: oneLineIdeaOutput,
      diagnosisReport: ideaDiagnosisOutput,
      personaReport: customerPersonaOutput,
      problemStatementReport: problemStatementOutput,
      validationExperimentReport: validationExperimentOutput,
      marketResearchReport: marketResearchOutput,
      competitorAnalysisReport: competitorAnalysisOutput,
      differentiationStrategyReport: differentiationStrategyOutput,
      businessModelReport: businessModelOutput,
      operation: operationContext
    };
    setGenerating(true);
    setAiError("");
    setNotice("AI가 세 가지 가격 패키지와 현장 운영 규칙을 설계하고 있습니다.");
    try {
      const response = await fetch("/api/generate-pricing-policy", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
      });
      const data = (await response.json()) as { draft?: PricingPolicyDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "가격정책 초안을 생성하지 못했습니다.");
      const formattedOutput = formatPricingPolicyDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice("가격정책 초안이 생성되었습니다. 표시된 금액은 가설이므로 실제 선택·결제 데이터로 조정해주세요.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "가격정책 생성 중 오류가 발생했습니다.");
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
      : isCustomerSurveyModule
        ? {
            inputTitle: "고객 검증 설문 메모 입력",
            inputDescription:
              "설문으로 확인하고 싶은 고객 문제와 응답 대상을 적어주세요. 앞선 인터뷰 질문지가 있으면 함께 참고해 3~5분 설문지로 정리합니다.",
            inputLabel: "설문 준비 메모",
            inputPlaceholder:
              "예: 늦은 시간 식사를 고민하는 자취생 30명에게 문제 빈도, 현재 대안, 비용 부담, 지불의사를 빠르게 확인하고 싶다.",
            resultTitle: "AI 고객 검증 설문지 / 수정 가능",
            resultDescription:
              "설문지는 대량 신호를 보는 초안입니다. 너무 많은 주관식 문항을 줄이고 선택지 편향이 없는지 확인하세요.",
            resultPlaceholder:
              "AI 생성 버튼을 누르면 설문 목표, 안내문, 선별 문항, 문제 검증 문항, 현재 대안 문항, 지불의사 문항, 분석 기준이 표시됩니다."
          }
        : isValidationExperimentModule
          ? {
              inputTitle: "검증 실험 메모 입력",
              inputDescription:
                "이번 주 안에 확인하고 싶은 가장 위험한 가정과 고객 문제를 적어주세요. 앞선 인터뷰·설문 결과가 있으면 함께 참고해 실행 가능한 실험으로 정리합니다.",
              inputLabel: "실험 준비 메모",
              inputPlaceholder:
                "예: 자취생이 늦은 시간 따뜻한 식사를 원한다는 가정을 검증하고 싶다. 20명에게 설문을 받고, 강한 응답자 5명에게 사전신청 의향을 확인하고 싶다.",
              resultTitle: "AI 검증 실험 설계안 / 수정 가능",
              resultDescription:
                "실험 설계안은 바로 실행할 초안입니다. 성공 기준과 실패 기준이 숫자로 측정 가능한지 확인하고, 오늘 할 일을 팀 상황에 맞게 줄이세요.",
              resultPlaceholder:
                "AI 생성 버튼을 누르면 실험 목표, 위험 가정, 가설, 실행 단계, 수집 데이터, 성공/실패 기준, 준비물, 일정이 표시됩니다."
            }
          : isMarketResearchModule
            ? {
                inputTitle: "시장조사 메모 입력",
                inputDescription:
                  "확인하려는 고객 범위, 지역, 사용 상황과 알고 있는 시장 단서를 적어주세요. AI는 숫자를 확정하지 않고 조사 산식과 출처 계획을 만듭니다.",
                inputLabel: "시장 범위·조사 메모",
                inputPlaceholder:
                  "예: 부산 지역 대학가의 자취생을 초기 고객으로 보고 있다. 늦은 시간 식사 수요, 현재 배달·편의점 지출, 접근 가능한 고객 수를 확인하고 싶다.",
                resultTitle: "AI 시장조사 리포트 / 수정 가능",
                resultDescription:
                  "최신 시장 수치는 자동 추정값으로 확정하지 않습니다. '확인 필요' 항목을 제시된 공공통계와 공식 자료에서 확인한 뒤 수정하세요.",
                resultPlaceholder:
                  "AI 생성 버튼을 누르면 시장 정의, 수요 신호, TAM/SAM/SOM 산식, 출처 검색 계획, 현장 조사 계획이 표시됩니다."
              }
            : isCompetitorAnalysisModule
              ? {
                  inputTitle: "경쟁사·현재 대안 메모 입력",
                  inputDescription:
                    "고객이 현재 사용하는 서비스, 직접 해결 방법, 포기하는 상황을 적어주세요. 시장조사 결과가 있으면 함께 비교합니다.",
                  inputLabel: "경쟁·대안 메모",
                  inputPlaceholder:
                    "예: 고객은 배달앱, 편의점 도시락, 직접 조리, 식사 포기를 대안으로 쓴다. 속도, 총비용, 따뜻함, 접근성을 비교하고 싶다.",
                  resultTitle: "AI 경쟁사 분석표 / 수정 가능",
                  resultDescription:
                    "경쟁사 가격과 기능은 최신 공식 자료 확인이 필요합니다. 근거 상태가 '확인 필요'인 항목은 제출 전 직접 검증하세요.",
                  resultPlaceholder:
                    "AI 생성 버튼을 누르면 고객 선택 기준, 직접 경쟁, 간접 대안, 무행동, 기회 영역, 확인 과제가 표시됩니다."
                }
              : isDifferentiationStrategyModule
                ? {
                    inputTitle: "차별화 전략 메모 입력",
                    inputDescription:
                      "핵심 고객이 기존 대안을 바꾸게 할 한 가지 이유를 적어주세요. 경쟁사 분석 결과를 바탕으로 차별점과 증거 계획을 좁힙니다.",
                    inputLabel: "차별화 가설 메모",
                    inputPlaceholder:
                      "예: 기능을 많이 제공하기보다 자취생이 3분 안에 따뜻한 한 끼를 준비하게 하는 경험에 집중하고 싶다.",
                    resultTitle: "AI 차별화 전략 / 수정 가능",
                    resultDescription:
                      "차별점은 아직 가설입니다. 포지셔닝 문장보다 증거와 실제 고객 선택 행동을 먼저 검증하세요.",
                    resultPlaceholder:
                      "AI 생성 버튼을 누르면 핵심 차별점 1개, 포지셔닝 문장, 증거, 실행 요소, 방어력 계획, 피할 주장이 표시됩니다."
                  }
                : isBusinessModelModule
                  ? {
                      inputTitle: "사업모델 메모 입력",
                      inputDescription:
                        "누가 가치를 받고 누가 비용을 지불하는지, 예상 수익원과 제공 비용을 적어주세요. 앞선 시장·경쟁·차별화 결과를 함께 반영합니다.",
                      inputLabel: "수익 구조·지불자 메모",
                      inputPlaceholder:
                        "예: 자취 대학생이 1회 이용료를 내고 따뜻한 식사를 받는다. 반복 고객용 월 패키지와 대학 기숙사 단체 공급도 검증하고 싶다.",
                      resultTitle: "AI 사업모델 설계안 / 수정 가능",
                      resultDescription:
                        "수익원과 단위경제 수치는 가설입니다. 가장 가능성이 높은 수익원 하나부터 예약금, 결제, 실제 제공 비용으로 확인하세요.",
                      resultPlaceholder:
                        "AI 생성 버튼을 누르면 수혜자·지불자, 수익원, 과금 기준, 핵심 비용, 단위경제 가정, 검증 계획이 표시됩니다."
                    }
                  : isPricingPolicyModule
                    ? {
                        inputTitle: "가격정책 메모 입력",
                        inputDescription:
                          "고객이 현재 대안에 쓰는 비용, 예상 제공 원가, 생각 중인 가격과 할인 조건을 적어주세요. 사업모델 결과를 바탕으로 세 가지 패키지를 만듭니다.",
                        inputLabel: "가격·패키지 메모",
                        inputPlaceholder:
                          "예: 1회 이용, 4회 묶음, 기숙사 단체 계약을 고민 중이다. 아직 실제 원가와 고객 지불의사는 확인하지 못했다.",
                        resultTitle: "AI 가격정책 설계안 / 수정 가능",
                        resultDescription:
                          "제안 가격은 확정값이 아니라 검증 가설입니다. 할인·환불 조건을 현장 운영이 가능한 수준으로 단순하게 유지하세요.",
                        resultPlaceholder:
                          "AI 생성 버튼을 누르면 입문형·핵심형·확장형 패키지, 할인·환불 규칙, 가격 실험과 지표가 표시됩니다."
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
            {isCustomerSurveyModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateCustomerSurvey}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 고객 검증 설문지 생성"}
              </button>
            ) : null}
            {isValidationExperimentModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateValidationExperiment}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 검증 실험 설계안 생성"}
              </button>
            ) : null}
            {isMarketResearchModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateMarketResearch}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 시장조사 리포트 생성"}
              </button>
            ) : null}
            {isCompetitorAnalysisModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateCompetitorAnalysis}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 경쟁사 분석표 생성"}
              </button>
            ) : null}
            {isDifferentiationStrategyModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateDifferentiationStrategy}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 차별화 전략 생성"}
              </button>
            ) : null}
            {isBusinessModelModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateBusinessModel}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 사업모델 설계안 생성"}
              </button>
            ) : null}
            {isPricingPolicyModule ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generatePricingPolicy}
                type="button"
              >
                {generating ? "AI 생성 중..." : "AI 가격정책 설계안 생성"}
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
