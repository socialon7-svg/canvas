"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDebouncedServerDraft } from "@/hooks/useDebouncedServerDraft";
import { loadModuleDraft } from "@/lib/moduleDraftClient";
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
  ParticipantOperationContext,
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
import {
  clearParticipantSession,
  fetchParticipantWorkspace,
  mergeParticipantEntryIntoOperationsState,
  readParticipantSession
} from "@/lib/participantSession";
import {
  formatStartupModuleDraft,
  getStartupModuleAutomationConfig,
  type AutomatedStartupModuleDraft
} from "@/lib/startupModuleAutomation";

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

interface SpecializedModuleRunnerContext {
  programName: string;
  teamName: string;
  participantName: string;
  ideaMemo: string;
  operation: ParticipantOperationContext;
  previousOutputs: Record<string, string>;
}

interface SpecializedModuleRunnerDefinition {
  endpoint: string;
  buttonLabel: string;
  emptyInputMessage: string;
  generatingMessage: string;
  failureMessage: string;
  completionMessage: string;
  buildRequest: (context: SpecializedModuleRunnerContext) => unknown;
  formatDraft: (draft: unknown) => string;
}

function defineSpecializedRunner<TDraft>(definition: Omit<SpecializedModuleRunnerDefinition, "formatDraft"> & {
  formatDraft: (draft: TDraft) => string;
}): SpecializedModuleRunnerDefinition {
  return {
    ...definition,
    formatDraft: (draft) => definition.formatDraft(draft as TDraft)
  };
}

const specializedModuleRunners: Record<string, SpecializedModuleRunnerDefinition> = {
  [ONE_LINE_IDEA_SLUG]: defineSpecializedRunner<OneLineIdeaDraft>({
    endpoint: "/api/generate-one-line-idea",
    buttonLabel: "AI 한 줄 아이디어 생성",
    emptyInputMessage: "아이디어 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 한 줄 아이디어 초안을 생성하고 있습니다.",
    failureMessage: "AI 초안을 생성하지 못했습니다.",
    completionMessage: "AI 초안이 생성되었습니다. 마음에 드는 문장으로 수정한 뒤 완료로 표시하세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation }) =>
      ({ programName, teamName, participantName, rawIdea: ideaMemo, operation }) satisfies OneLineIdeaInput,
    formatDraft: formatOneLineIdeaDraft
  }),
  [IDEA_DIAGNOSIS_SLUG]: defineSpecializedRunner<IdeaDiagnosisDraft>({
    endpoint: "/api/generate-idea-diagnosis",
    buttonLabel: "AI 사전진단 리포트 생성",
    emptyInputMessage: "진단할 아이디어 내용을 먼저 입력해주세요.",
    generatingMessage: "AI가 아이디어 사전진단 리포트를 생성하고 있습니다.",
    failureMessage: "사전진단 리포트를 생성하지 못했습니다.",
    completionMessage: "사전진단 리포트가 생성되었습니다. 점수와 보완 액션을 확인한 뒤 완료로 표시하세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        operation
      }) satisfies IdeaDiagnosisInput,
    formatDraft: formatIdeaDiagnosisDraft
  }),
  [CUSTOMER_PERSONA_SLUG]: defineSpecializedRunner<CustomerPersonaDraft>({
    endpoint: "/api/generate-customer-persona",
    buttonLabel: "AI 고객 페르소나 생성",
    emptyInputMessage: "페르소나를 만들 아이디어 내용을 먼저 입력해주세요.",
    generatingMessage: "AI가 핵심 고객 페르소나를 생성하고 있습니다.",
    failureMessage: "고객 페르소나를 생성하지 못했습니다.",
    completionMessage: "고객 페르소나가 생성되었습니다. 실제 인터뷰 가능한 고객인지 확인한 뒤 완료로 표시하세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        operation
      }) satisfies CustomerPersonaInput,
    formatDraft: formatCustomerPersonaDraft
  }),
  [CUSTOMER_JOURNEY_SLUG]: defineSpecializedRunner<CustomerJourneyDraft>({
    endpoint: "/api/generate-customer-journey",
    buttonLabel: "AI 고객 여정지도 생성",
    emptyInputMessage: "여정지도를 만들 고객 상황을 먼저 입력해주세요.",
    generatingMessage: "AI가 고객 여정지도를 생성하고 있습니다.",
    failureMessage: "고객 여정지도를 생성하지 못했습니다.",
    completionMessage: "고객 여정지도가 생성되었습니다. 가장 고통이 큰 순간과 서비스 기회를 확인한 뒤 완료로 표시하세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        operation
      }) satisfies CustomerJourneyInput,
    formatDraft: formatCustomerJourneyDraft
  }),
  [PROBLEM_STATEMENT_SLUG]: defineSpecializedRunner<ProblemStatementDraft>({
    endpoint: "/api/generate-problem-statement",
    buttonLabel: "AI 문제정의문 생성",
    emptyInputMessage: "문제정의문을 만들 고객 문제 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 발표용 문제정의문을 생성하고 있습니다.",
    failureMessage: "문제정의문을 생성하지 못했습니다.",
    completionMessage: "문제정의문이 생성되었습니다. 실제 고객에게 검증 가능한 문장인지 확인한 뒤 완료로 표시해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        journeyReport: previousOutputs[CUSTOMER_JOURNEY_SLUG] || "",
        operation
      }) satisfies ProblemStatementInput,
    formatDraft: formatProblemStatementDraft
  }),
  [CUSTOMER_INTERVIEW_SLUG]: defineSpecializedRunner<CustomerInterviewDraft>({
    endpoint: "/api/generate-customer-interview",
    buttonLabel: "AI 고객 인터뷰 질문지 생성",
    emptyInputMessage: "고객 인터뷰 질문지를 만들 문제 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 고객 인터뷰 질문지를 생성하고 있습니다.",
    failureMessage: "고객 인터뷰 질문지를 생성하지 못했습니다.",
    completionMessage: "고객 인터뷰 질문지가 생성되었습니다. 유도질문을 줄이고 최근 실제 경험을 묻는지 확인한 뒤 완료로 표시해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        journeyReport: previousOutputs[CUSTOMER_JOURNEY_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        operation
      }) satisfies CustomerInterviewInput,
    formatDraft: formatCustomerInterviewDraft
  }),
  [CUSTOMER_SURVEY_SLUG]: defineSpecializedRunner<CustomerSurveyDraft>({
    endpoint: "/api/generate-survey",
    buttonLabel: "AI 고객 검증 설문지 생성",
    emptyInputMessage: "고객 검증 설문지를 만들 문제 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 고객 검증 설문지를 생성하고 있습니다.",
    failureMessage: "고객 검증 설문지를 생성하지 못했습니다.",
    completionMessage: "고객 검증 설문지가 생성되었습니다. 선택지가 편향되지 않았는지 확인한 뒤 완료로 표시해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        journeyReport: previousOutputs[CUSTOMER_JOURNEY_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        interviewReport: previousOutputs[CUSTOMER_INTERVIEW_SLUG] || "",
        operation
      }) satisfies CustomerSurveyInput,
    formatDraft: formatCustomerSurveyDraft
  }),
  [VALIDATION_EXPERIMENT_SLUG]: defineSpecializedRunner<ValidationExperimentDraft>({
    endpoint: "/api/generate-validation-experiment",
    buttonLabel: "AI 검증 실험 설계안 생성",
    emptyInputMessage: "검증 실험을 만들 고객 문제 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 검증 실험 설계안을 생성하고 있습니다.",
    failureMessage: "검증 실험 설계안을 생성하지 못했습니다.",
    completionMessage: "검증 실험 설계안이 생성되었습니다. 성공 기준이 숫자로 측정 가능한지 확인한 뒤 완료로 표시해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        journeyReport: previousOutputs[CUSTOMER_JOURNEY_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        interviewReport: previousOutputs[CUSTOMER_INTERVIEW_SLUG] || "",
        surveyReport: previousOutputs[CUSTOMER_SURVEY_SLUG] || "",
        operation
      }) satisfies ValidationExperimentInput,
    formatDraft: formatValidationExperimentDraft
  }),
  [MARKET_RESEARCH_SLUG]: defineSpecializedRunner<MarketResearchDraft>({
    endpoint: "/api/generate-market-research",
    buttonLabel: "AI 시장조사 리포트 생성",
    emptyInputMessage: "시장조사 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 시장조사 리포트 초안을 생성하고 있습니다.",
    failureMessage: "시장조사 리포트를 생성하지 못했습니다.",
    completionMessage: "시장조사 초안이 생성되었습니다. '확인 필요' 숫자는 제시된 출처에서 직접 확인해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        validationExperimentReport: previousOutputs[VALIDATION_EXPERIMENT_SLUG] || "",
        operation
      }) satisfies MarketResearchInput,
    formatDraft: formatMarketResearchDraft
  }),
  [COMPETITOR_ANALYSIS_SLUG]: defineSpecializedRunner<CompetitorAnalysisDraft>({
    endpoint: "/api/generate-competitor-analysis",
    buttonLabel: "AI 경쟁사 분석표 생성",
    emptyInputMessage: "경쟁사 분석 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 경쟁사와 현재 대안을 비교하고 있습니다.",
    failureMessage: "경쟁사 분석표를 생성하지 못했습니다.",
    completionMessage: "경쟁사 분석표가 생성되었습니다. 가격과 기능은 근거 상태를 확인한 뒤 수정해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        validationExperimentReport: previousOutputs[VALIDATION_EXPERIMENT_SLUG] || "",
        marketResearchReport: previousOutputs[MARKET_RESEARCH_SLUG] || "",
        operation
      }) satisfies CompetitorAnalysisInput,
    formatDraft: formatCompetitorAnalysisDraft
  }),
  [DIFFERENTIATION_STRATEGY_SLUG]: defineSpecializedRunner<DifferentiationStrategyDraft>({
    endpoint: "/api/generate-differentiation-strategy",
    buttonLabel: "AI 차별화 전략 생성",
    emptyInputMessage: "차별화 전략 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 가장 강한 차별점 한 가지를 정리하고 있습니다.",
    failureMessage: "차별화 전략을 생성하지 못했습니다.",
    completionMessage: "차별화 전략이 생성되었습니다. 차별점이 고객 선택 행동으로 이어지는지 다음 액션으로 검증해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        validationExperimentReport: previousOutputs[VALIDATION_EXPERIMENT_SLUG] || "",
        marketResearchReport: previousOutputs[MARKET_RESEARCH_SLUG] || "",
        competitorAnalysisReport: previousOutputs[COMPETITOR_ANALYSIS_SLUG] || "",
        operation
      }) satisfies DifferentiationStrategyInput,
    formatDraft: formatDifferentiationStrategyDraft
  }),
  [BUSINESS_MODEL_SLUG]: defineSpecializedRunner<BusinessModelDraft>({
    endpoint: "/api/generate-business-model",
    buttonLabel: "AI 사업모델 설계안 생성",
    emptyInputMessage: "사업모델 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 고객, 지불자, 수익원과 비용 가정을 정리하고 있습니다.",
    failureMessage: "사업모델 초안을 생성하지 못했습니다.",
    completionMessage: "사업모델 초안이 생성되었습니다. 수익원 하나를 골라 실제 결제 행동으로 먼저 검증해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        validationExperimentReport: previousOutputs[VALIDATION_EXPERIMENT_SLUG] || "",
        marketResearchReport: previousOutputs[MARKET_RESEARCH_SLUG] || "",
        competitorAnalysisReport: previousOutputs[COMPETITOR_ANALYSIS_SLUG] || "",
        differentiationStrategyReport: previousOutputs[DIFFERENTIATION_STRATEGY_SLUG] || "",
        operation
      }) satisfies BusinessModelInput,
    formatDraft: formatBusinessModelDraft
  }),
  [PRICING_POLICY_SLUG]: defineSpecializedRunner<PricingPolicyDraft>({
    endpoint: "/api/generate-pricing-policy",
    buttonLabel: "AI 가격정책 설계안 생성",
    emptyInputMessage: "가격정책 메모를 먼저 입력해주세요.",
    generatingMessage: "AI가 세 가지 가격 패키지와 현장 운영 규칙을 설계하고 있습니다.",
    failureMessage: "가격정책 초안을 생성하지 못했습니다.",
    completionMessage: "가격정책 초안이 생성되었습니다. 표시된 금액은 가설이므로 실제 선택·결제 데이터로 조정해주세요.",
    buildRequest: ({ programName, teamName, participantName, ideaMemo, operation, previousOutputs }) =>
      ({
        programName,
        teamName,
        participantName,
        ideaMemo,
        oneLineIdea: previousOutputs[ONE_LINE_IDEA_SLUG] || "",
        diagnosisReport: previousOutputs[IDEA_DIAGNOSIS_SLUG] || "",
        personaReport: previousOutputs[CUSTOMER_PERSONA_SLUG] || "",
        problemStatementReport: previousOutputs[PROBLEM_STATEMENT_SLUG] || "",
        validationExperimentReport: previousOutputs[VALIDATION_EXPERIMENT_SLUG] || "",
        marketResearchReport: previousOutputs[MARKET_RESEARCH_SLUG] || "",
        competitorAnalysisReport: previousOutputs[COMPETITOR_ANALYSIS_SLUG] || "",
        differentiationStrategyReport: previousOutputs[DIFFERENTIATION_STRATEGY_SLUG] || "",
        businessModelReport: previousOutputs[BUSINESS_MODEL_SLUG] || "",
        operation
      }) satisfies PricingPolicyInput,
    formatDraft: formatPricingPolicyDraft
  })
};

export default function ParticipantModulePlaceholder({ slug }: { slug: string }) {
  const [state, setState] = useState<HighViewOperationsState>(() => defaultOperationsState());
  const [programId, setProgramId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [inputData, setInputData] = useState("");
  const [outputData, setOutputData] = useState("");
  const [notice, setNotice] = useState("");
  const [aiError, setAiError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loaded = loadOperationsState();
    const session = readParticipantSession();
    const storedProgramId = session.programId;
    const storedParticipantId = session.participantId;
    setState(loaded);
    setProgramId(storedProgramId);
    setParticipantId(storedParticipantId);

    const participant = loaded.participants.find((item) => item.id === storedParticipantId);
    const progress = participant?.moduleProgress?.[slug];
    if (progress?.inputData) setInputData(progress.inputData);
    if (progress?.outputData) setOutputData(progress.outputData);

    const restoreDraft = async (nextProgramId: string, nextParticipantId: string, progressUpdatedAt?: string) => {
      const savedDraft = await loadModuleDraft<{ inputData?: string; outputData?: string }>({
        programId: nextProgramId,
        participantId: nextParticipantId,
        moduleSlug: slug
      });
      if (cancelled || !savedDraft?.draftData) return;

      const draftSavedAt = Date.parse(savedDraft.savedAt || "");
      const progressSavedAt = Date.parse(progressUpdatedAt || "");
      if (Number.isFinite(progressSavedAt) && Number.isFinite(draftSavedAt) && draftSavedAt < progressSavedAt) return;

      if (typeof savedDraft.draftData.inputData === "string") setInputData(savedDraft.draftData.inputData);
      if (typeof savedDraft.draftData.outputData === "string") setOutputData(savedDraft.draftData.outputData);
      setNotice(
        savedDraft.fallback
          ? "이 브라우저에 임시 저장된 작성 내용을 복구했습니다."
          : "서버에 자동 저장된 작성 내용을 복구했습니다."
      );
    };

    if (storedProgramId && storedParticipantId) {
      fetchParticipantWorkspace()
        .then(async ({ response, data }) => {
          if (cancelled) return;
          if (response.ok && data.program && data.participant) {
            const nextState = mergeParticipantEntryIntoOperationsState({
              program: data.program,
              participant: data.participant,
              team: data.team || null,
              feedbacks: data.feedbacks
            });
            const freshParticipant = nextState.participants.find((item) => item.id === data.participant?.id);
            const freshProgress = freshParticipant?.moduleProgress?.[slug];
            setState(nextState);
            setProgramId(data.program.id);
            setParticipantId(data.participant.id);
            if (freshProgress) {
              setInputData(freshProgress.inputData || "");
              setOutputData(freshProgress.outputData || "");
            }
            await restoreDraft(data.program.id, data.participant.id, freshProgress?.updatedAt);
            return;
          }
          if (response.status === 401 || response.status === 404) {
            clearParticipantSession();
            setProgramId("");
            setParticipantId("");
            setAiError("참여자 세션이 만료되었습니다. 참여자 포털에서 다시 입장해주세요.");
            return;
          }
          await restoreDraft(storedProgramId, storedParticipantId, progress?.updatedAt);
        })
        .catch(async () => {
          if (cancelled) return;
          await restoreDraft(storedProgramId, storedParticipantId, progress?.updatedAt);
          if (!cancelled) setNotice("네트워크 연결이 불안정해 이 브라우저의 임시 저장 내용을 표시합니다.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const startupModule = getStartupModuleBySlug(slug);
  const program = state.programs.find((item) => item.id === programId);
  const participant = state.participants.find((item) => item.id === participantId);
  const team = participant ? state.teams.find((item) => item.id === participant.teamId) : undefined;
  const visibleModules = getParticipantVisibleModules(program);
  const isAllowed = Boolean(startupModule && visibleModules.some((item) => item.slug === startupModule.slug));
  const progress = startupModule ? participant?.moduleProgress?.[startupModule.slug] : undefined;
  const currentStatus = progress?.status || "not_started";
  const draftSave = useDebouncedServerDraft({
    programId: program?.id,
    participantId: participant?.id,
    moduleSlug: startupModule?.slug || slug,
    draftData: { inputData, outputData },
    currentStep: outputData.trim() ? 2 : inputData.trim() ? 1 : 0,
    enabled: Boolean(program && participant && startupModule && isAllowed),
    shouldSave: Boolean(inputData.trim() || outputData.trim()),
    debounceMs: 1000
  });
  const saveDraftNow = draftSave.saveNow;
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
  const specializedModuleRunner = startupModule ? specializedModuleRunners[startupModule.slug] : undefined;
  const automatedModuleConfig = startupModule ? getStartupModuleAutomationConfig(startupModule.slug) : undefined;
  const previousOutputs = Object.fromEntries(
    Object.entries(participant?.moduleProgress || {}).map(([moduleSlug, moduleProgress]) => [
      moduleSlug,
      moduleProgress.outputData || ""
    ])
  );
  const operationContext: ParticipantOperationContext | undefined = program && participant
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

  useEffect(() => {
    const saveWithShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraftNow();
      }
    };
    window.addEventListener("keydown", saveWithShortcut);
    return () => window.removeEventListener("keydown", saveWithShortcut);
  }, [saveDraftNow]);

  const saveProgress = async (
    status: ParticipantModuleProgressStatus,
    values?: { inputData?: string; outputData?: string }
  ) => {
    if (!startupModule || !participant) return;
    setSavingProgress(true);
    setAiError("");
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

    try {
      if (program) {
        const response = await fetch("/api/module-progress", {
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
        const data = (await response.json().catch(() => ({}))) as { code?: string; error?: string };
        if (!response.ok) {
          const isDemoFallback =
            response.status === 503 &&
            (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY");
          if (isDemoFallback) {
            setNotice(`데모 모드: ${startupModule.title} 상태를 이 브라우저에 임시 저장했습니다.`);
            return;
          }
          throw new Error(data.error || "중앙 저장소에 모듈 상태를 저장하지 못했습니다.");
        }

        setNotice(
          status === "completed"
            ? `${startupModule.title} 완료 결과와 제출 기록을 저장했습니다.`
            : `${startupModule.title} 상태를 '${statusLabel(status)}'로 저장했습니다.`
        );
        return;
      }
      setNotice(`데모 모드: ${startupModule.title} 상태를 이 브라우저에 임시 저장했습니다.`);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "모듈 상태 저장 중 오류가 발생했습니다.");
      setNotice("이 브라우저에는 임시 저장됐지만 중앙 저장은 확인되지 않았습니다. 다시 저장해주세요.");
    } finally {
      setSavingProgress(false);
    }
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

  const generateSpecializedModule = async () => {
    if (!program || !participant || !startupModule || !specializedModuleRunner || !operationContext) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) {
      setAiError(specializedModuleRunner.emptyInputMessage);
      return;
    }

    setGenerating(true);
    setAiError("");
    setNotice(specializedModuleRunner.generatingMessage);
    try {
      const response = await fetch(specializedModuleRunner.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          specializedModuleRunner.buildRequest({
            programName: program.name,
            teamName: team?.name || "",
            participantName: participant.name || participant.code,
            ideaMemo,
            operation: operationContext,
            previousOutputs
          })
        )
      });
      const data = (await response.json().catch(() => ({}))) as { draft?: unknown; error?: string };
      if (!response.ok || !data.draft) {
        throw new Error(data.error || specializedModuleRunner.failureMessage);
      }

      const formattedOutput = specializedModuleRunner.formatDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice(specializedModuleRunner.completionMessage);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : specializedModuleRunner.failureMessage);
      setNotice("");
    } finally {
      setGenerating(false);
    }
  };

  const generateAutomatedModule = async () => {
    if (!program || !participant || !startupModule || !automatedModuleConfig) return;
    const ideaMemo = inputData.trim();
    if (!ideaMemo) return setAiError(`${automatedModuleConfig.inputLabel}를 먼저 입력해주세요.`);
    const previousResults = Object.entries(participant.moduleProgress || {})
      .filter(([moduleSlug, moduleProgress]) => moduleSlug !== startupModule.slug && moduleProgress.outputData?.trim())
      .map(([moduleSlug, moduleProgress]) => {
        const sourceModule = getStartupModuleBySlug(moduleSlug);
        return `[${sourceModule?.title || moduleSlug}]\n${moduleProgress.outputData.slice(0, 1800)}`;
      })
      .join("\n\n")
      .slice(0, 10000);

    setGenerating(true);
    setAiError("");
    setNotice(automatedModuleConfig.generatingMessage);
    try {
      const response = await fetch("/api/generate-startup-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSlug: startupModule.slug,
          programName: program.name,
          teamName: team?.name || "",
          participantName: participant.name || participant.code,
          ideaMemo,
          previousResults,
          operation: operationContext
        })
      });
      const data = (await response.json()) as { draft?: AutomatedStartupModuleDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || `${startupModule.title} 초안을 생성하지 못했습니다.`);
      const formattedOutput = formatStartupModuleDraft(data.draft);
      setOutputData(formattedOutput);
      await saveProgress("in_progress", { inputData: ideaMemo, outputData: formattedOutput });
      setNotice(automatedModuleConfig.completionMessage);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : `${startupModule.title} 생성 중 오류가 발생했습니다.`);
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
  const activeModuleCopy = automatedModuleConfig || moduleCopyOverride;
  const displayInputTitle = activeModuleCopy?.inputTitle || inputTitle;
  const displayInputDescription = activeModuleCopy?.inputDescription || inputDescription;
  const displayInputLabel = activeModuleCopy?.inputLabel || inputLabel;
  const displayInputPlaceholder = activeModuleCopy?.inputPlaceholder || inputPlaceholder;
  const displayResultTitle = activeModuleCopy?.resultTitle || resultTitle;
  const displayResultDescription = activeModuleCopy?.resultDescription || resultDescription;
  const displayResultPlaceholder = activeModuleCopy?.resultPlaceholder || resultPlaceholder;
  const hasModuleContent = Boolean(inputData.trim() || outputData.trim());
  const workspaceSteps = [
    { label: "메모 작성", description: "아이디어와 현장 정보를 정리합니다.", done: Boolean(inputData.trim()) },
    { label: "초안 만들기", description: "AI 초안을 만들고 직접 다듬습니다.", done: Boolean(outputData.trim()) },
    { label: "검토 후 완료", description: "최종 내용을 확인하고 제출합니다.", done: currentStatus === "completed" }
  ];
  const completedWorkspaceSteps = workspaceSteps.filter((step) => step.done).length;
  const workspaceProgress = Math.round((completedWorkspaceSteps / workspaceSteps.length) * 100);
  const lastSavedAt = draftSave.lastSavedAt
    ? new Date(draftSave.lastSavedAt)
    : progress?.updatedAt
      ? new Date(progress.updatedAt)
      : null;
  const draftStatusText =
    !draftSave.isOnline
      ? "오프라인 · 이 브라우저에 안전하게 저장합니다"
      : draftSave.status === "saving"
      ? "자동 저장 중..."
      : draftSave.status === "error"
        ? "자동 저장 실패"
        : lastSavedAt
          ? `${draftSave.fallbackMode ? "이 브라우저에" : "저장됨"} · ${lastSavedAt.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit"
            })}`
          : "입력하면 자동 저장됩니다";

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 pb-20 sm:px-5 sm:py-8 lg:px-6">
      <header className="app-surface p-5 sm:p-6">
        <Link className="text-sm font-bold text-[#6b7684] hover:text-[#333d4b]" href="/participant">
          모듈 목록으로 돌아가기
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="mt-4">
            <p className="text-sm font-bold text-[#3182f6]">
              STEP {startupModule.order} · {startupModuleCategoryLabels[startupModule.category]}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#191f28] sm:text-3xl">{startupModule.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7684]">{startupModule.description}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 md:justify-end">
            <span className="w-fit rounded-full bg-[#e8f3ff] px-3 py-1.5 text-sm font-bold text-[#1b64da]">
              {statusLabel(currentStatus)}
            </span>
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-sm font-bold ${
                draftSave.status === "error"
                  ? "bg-red-50 text-red-700"
                  : draftSave.fallbackMode
                    ? "bg-amber-50 text-amber-800"
                    : "bg-green-50 text-green-700"
              }`}
            >
              {draftStatusText}
            </span>
          </div>
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

      <section className="mt-4 grid items-start gap-4 lg:grid-cols-[200px_minmax(0,1fr)_260px] min-[1280px]:grid-cols-[230px_minmax(0,1fr)_300px]">
        <nav className="app-surface p-4 lg:sticky lg:top-4" aria-label="모듈 작성 단계">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#8b95a1]">진행 상황</p>
              <p className="mt-1 text-xl font-black text-[#191f28]">{workspaceProgress}%</p>
            </div>
            <span className="rounded-full bg-[#e8f3ff] px-2.5 py-1 text-xs font-bold text-[#1b64da]">
              {completedWorkspaceSteps}/{workspaceSteps.length} 완료
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2f4f6]">
            <div className="h-full rounded-full bg-[#3182f6] transition-all" style={{ width: `${workspaceProgress}%` }} />
          </div>
          <ol className="mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-1">
            {workspaceSteps.map((step, index) => (
              <li className="flex gap-3 rounded-md border border-[#e5e8eb] p-3" key={step.label}>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    step.done ? "bg-green-100 text-green-700" : "bg-[#f2f4f6] text-[#8b95a1]"
                  }`}
                >
                  {step.done ? "OK" : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${step.done ? "text-green-700" : "text-[#333d4b]"}`}>
                    {step.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#8b95a1]">{step.description}</span>
                </span>
              </li>
            ))}
          </ol>
          <div
            className={`mt-4 rounded-md border px-3 py-3 text-xs leading-5 ${
              draftSave.status === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : draftSave.fallbackMode
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-blue-100 bg-blue-50 text-[#1b64da]"
            }`}
          >
            <p className="font-bold">{draftStatusText}</p>
            <p className="mt-1 text-current/80">Ctrl+S로 즉시 저장 · Tab으로 다음 입력 이동</p>
            {draftSave.error ? <p className="mt-1">{draftSave.error}</p> : null}
          </div>
        </nav>

        <div className="grid min-w-0 gap-4">
        <form
          className="app-surface p-5 sm:p-6"
          onBlurCapture={() => void saveDraftNow()}
          onSubmit={(event) => event.preventDefault()}
        >
          <p className="text-sm font-bold text-[#3182f6]">1. 아이디어 메모</p>
          <h2 className="mt-1 text-xl font-bold text-[#191f28]">{displayInputTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7684]">{displayInputDescription}</p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-[#333d4b]">{displayInputLabel}</span>
            <textarea
              className="min-h-80 w-full resize-y rounded-md border border-[#d1d6db] px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[#3182f6] focus:ring-3 focus:ring-blue-100 lg:min-h-[360px]"
              maxLength={6000}
              onChange={(event) => setInputData(event.target.value)}
              placeholder={displayInputPlaceholder}
              value={inputData}
            />
            <span className="mt-1 block text-right text-xs text-[#8b95a1]">{inputData.length.toLocaleString()}/6,000자</span>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {specializedModuleRunner ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateSpecializedModule}
                type="button"
              >
                {generating ? "AI 생성 중..." : specializedModuleRunner.buttonLabel}
              </button>
            ) : null}
            {automatedModuleConfig && !automatedModuleConfig.adminOnly ? (
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                disabled={generating || !inputData.trim()}
                onClick={generateAutomatedModule}
                type="button"
              >
                {generating ? "AI 생성 중..." : automatedModuleConfig.buttonLabel}
              </button>
            ) : null}
            <button
              className="app-secondary-button min-h-10 text-sm text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={savingProgress}
              onClick={() => saveProgress("in_progress")}
              type="button"
            >
              {savingProgress ? "저장 중..." : "임시 저장"}
            </button>
            <button
              className="app-secondary-button min-h-10 text-sm text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={savingProgress}
              onClick={() => saveProgress("needs_review")}
              type="button"
            >
              {savingProgress ? "저장 중..." : "검토 필요 표시"}
            </button>
          </div>
        </form>

          <section
            className="app-surface border-blue-100 p-5 sm:p-6"
            onBlurCapture={() => void saveDraftNow()}
          >
            <p className="text-sm font-bold text-[#3182f6]">2. AI 초안 확인</p>
            <h2 className="mt-1 text-xl font-bold text-[#191f28]">{displayResultTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b7684]">{displayResultDescription}</p>
            <textarea
              className="mt-4 min-h-80 w-full resize-y rounded-md border border-[#d1d6db] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[#3182f6] focus:ring-3 focus:ring-blue-100 lg:min-h-[360px]"
              maxLength={12000}
              onChange={(event) => setOutputData(event.target.value)}
              placeholder={displayResultPlaceholder}
              value={outputData}
            />
            <span className="mt-1 block text-right text-xs text-[#8b95a1]">{outputData.length.toLocaleString()}/12,000자</span>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                className="app-primary-button text-sm disabled:cursor-not-allowed"
                disabled={savingProgress || !hasModuleContent}
                onClick={() => saveProgress("completed")}
                type="button"
              >
                {savingProgress ? "저장 중..." : currentStatus === "completed" ? "수정 내용 저장" : "검토 완료하기"}
              </button>
              <button
                className="app-secondary-button text-sm text-[#1b64da]"
                onClick={copyOutput}
                type="button"
              >
                결과 복사
              </button>
            </div>
            {!hasModuleContent ? (
              <p className="mt-3 text-xs leading-5 text-[#8b95a1]">메모를 작성하거나 AI 초안을 만든 뒤 완료할 수 있어요.</p>
            ) : null}
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-4 lg:grid-cols-1">
          {progress?.adminComment ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-sm font-bold text-amber-800">멘토·운영진 피드백</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{progress.adminComment}</p>
              {progress.reviewedAt ? (
                <p className="mt-3 text-xs text-amber-800">검토 시각: {new Date(progress.reviewedAt).toLocaleString("ko-KR")}</p>
              ) : null}
            </section>
          ) : (
            <section className="app-surface p-4">
              <p className="text-sm font-bold text-[#333d4b]">멘토 피드백</p>
              <p className="mt-2 text-sm leading-6 text-[#8b95a1]">검토가 등록되면 이곳에서 바로 확인할 수 있습니다.</p>
            </section>
          )}

          <section className="app-surface p-4">
            <p className="text-sm font-bold text-[#333d4b]">작성 예시와 AI 도움말</p>
            <div className="mt-3 rounded-md bg-[#f7f8fa] p-3">
              <p className="text-xs font-bold text-[#6b7684]">예시</p>
              <p className="mt-1 text-sm leading-6 text-[#4e5968]">{displayInputPlaceholder}</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6b7684]">
              <li>• 고객, 상황, 행동을 구체적으로 적어주세요.</li>
              <li>• 확인한 숫자나 현장 근거가 있으면 함께 적어주세요.</li>
              <li>• AI 결과는 그대로 제출하지 않고 직접 수정할 수 있습니다.</li>
            </ul>
          </section>

          <section className="app-surface p-4">
            <p className="text-sm font-bold text-[#333d4b]">제출 전 체크리스트</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6b7684]">
              <li className={inputData.trim() ? "font-semibold text-green-700" : ""}>
                {inputData.trim() ? "완료" : "대기"} · 아이디어와 현장 정보를 입력했나요?
              </li>
              <li className={outputData.trim() ? "font-semibold text-green-700" : ""}>
                {outputData.trim() ? "완료" : "대기"} · AI 초안을 직접 검토하고 수정했나요?
              </li>
              <li className={currentStatus === "completed" ? "font-semibold text-green-700" : ""}>
                {currentStatus === "completed" ? "완료" : "대기"} · 검토 완료 버튼을 눌렀나요?
              </li>
            </ul>
          </section>

          <section className="app-surface p-4 text-sm">
            <p className="font-bold text-[#4e5968]">참여 정보</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
              <div><dt className="text-[#8b95a1]">프로그램</dt><dd className="mt-1 font-bold text-[#333d4b]">{program.name}</dd></div>
              <div><dt className="text-[#8b95a1]">참여자</dt><dd className="mt-1 font-bold text-[#333d4b]">{participant.name || participant.code}</dd></div>
              <div><dt className="text-[#8b95a1]">마지막 저장</dt><dd className="mt-1 font-bold text-[#333d4b]">{lastSavedAt ? lastSavedAt.toLocaleString("ko-KR") : "아직 없음"}</dd></div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
}
