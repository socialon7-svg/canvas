import {
  type CustomerInterviewDraft,
  type CustomerInterviewInput,
  type CustomerPersonaDraft,
  type CustomerPersonaInput,
  type CustomerJourneyDraft,
  type CustomerJourneyInput,
  type CustomerSurveyDraft,
  type CustomerSurveyInput,
  type CustomerSurveyQuestion,
  type CustomerSurveyQuestionType,
  emptyCanvasDraft,
  type IdeaDiagnosisDraft,
  type IdeaDiagnosisInput,
  type LeanCanvasDraft,
  type ModuStartupDraft,
  type ModuStartupInput,
  type OneLineIdeaDraft,
  type OneLineIdeaInput,
  type ParticipantInput,
  type ProblemStatementDraft,
  type ProblemStatementInput
} from "@/lib/types";
import { z } from "zod";

const requiredKeys = Object.keys(emptyCanvasDraft) as Array<keyof LeanCanvasDraft>;
const DEFAULT_AI_MODEL = "gpt-5.4";
const DEFAULT_NVIDIA_FALLBACK_MODEL = "openai/gpt-oss-120b";
const MAX_CANVAS_BULLET_LENGTH = 35;

const canvasBulletArraySchema = z.array(z.string().trim().min(1).max(MAX_CANVAS_BULLET_LENGTH)).min(1).max(3);
const leanCanvasDraftSchema = z.object({
  problem: canvasBulletArraySchema,
  existingAlternatives: canvasBulletArraySchema,
  customerSegments: canvasBulletArraySchema,
  uniqueValueProposition: canvasBulletArraySchema,
  solution: canvasBulletArraySchema,
  channels: canvasBulletArraySchema,
  revenueStreams: canvasBulletArraySchema,
  costStructure: canvasBulletArraySchema,
  keyMetrics: canvasBulletArraySchema,
  unfairAdvantage: canvasBulletArraySchema,
  mentorComment: canvasBulletArraySchema
});

const nonEmptyTextSchema = z.string().trim().min(1);
const moduStartupDraftSchema = z.object({
  q1IdeaIntro: nonEmptyTextSchema,
  q2BackgroundStory: nonEmptyTextSchema,
  q3CustomerProblem: nonEmptyTextSchema,
  q4ExecutionPlan: nonEmptyTextSchema,
  q5CategoryReason: nonEmptyTextSchema,
  q6BusinessStatusCheck: nonEmptyTextSchema,
  q7TeamIntro: nonEmptyTextSchema,
  q8VideoPitch: nonEmptyTextSchema,
  openingHook: nonEmptyTextSchema,
  evidenceLines: z.array(nonEmptyTextSchema).min(1).max(5),
  personaDefinition: nonEmptyTextSchema,
  differentiationFocus: nonEmptyTextSchema,
  policyKeywords: z.array(nonEmptyTextSchema).min(1).max(3),
  socialImpactEnding: nonEmptyTextSchema,
  finalChecklist: z.array(nonEmptyTextSchema).min(1).max(7),
  mentorComment: nonEmptyTextSchema
});

const oneLineIdeaTextSchema = z.string().trim().min(1).max(220);
const oneLineIdeaDraftSchema = z.object({
  primaryOneLine: oneLineIdeaTextSchema,
  alternatives: z.array(oneLineIdeaTextSchema).min(2).max(4),
  targetCustomer: oneLineIdeaTextSchema,
  problem: oneLineIdeaTextSchema,
  solution: oneLineIdeaTextSchema,
  valueProposition: oneLineIdeaTextSchema,
  pitchTip: oneLineIdeaTextSchema,
  nextQuestions: z.array(oneLineIdeaTextSchema).min(2).max(5),
  mentorComment: oneLineIdeaTextSchema
});

const diagnosisTextSchema = z.string().trim().min(1).max(260);
const ideaDiagnosisScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: diagnosisTextSchema,
  improvement: diagnosisTextSchema
});
const ideaDiagnosisDraftSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: diagnosisTextSchema,
  problemFit: ideaDiagnosisScoreSchema,
  customerFit: ideaDiagnosisScoreSchema,
  marketFit: ideaDiagnosisScoreSchema,
  feasibility: ideaDiagnosisScoreSchema,
  strengths: z.array(diagnosisTextSchema).min(2).max(4),
  risks: z.array(diagnosisTextSchema).min(2).max(4),
  nextActions: z.array(diagnosisTextSchema).min(3).max(5),
  mentorComment: diagnosisTextSchema
});

const personaTextSchema = z.string().trim().min(1).max(260);
const customerPersonaDraftSchema = z.object({
  personaName: personaTextSchema,
  personaSummary: personaTextSchema,
  demographic: personaTextSchema,
  situation: personaTextSchema,
  jobToBeDone: personaTextSchema,
  painPoints: z.array(personaTextSchema).min(2).max(5),
  currentAlternatives: z.array(personaTextSchema).min(2).max(5),
  buyingTriggers: z.array(personaTextSchema).min(2).max(5),
  objections: z.array(personaTextSchema).min(2).max(5),
  channels: z.array(personaTextSchema).min(2).max(5),
  interviewQuestions: z.array(personaTextSchema).min(4).max(7),
  mentorComment: personaTextSchema
});

const journeyTextSchema = z.string().trim().min(1).max(260);
const customerJourneyStepSchema = z.object({
  stage: journeyTextSchema,
  customerAction: journeyTextSchema,
  touchpoint: journeyTextSchema,
  emotion: journeyTextSchema,
  painPoint: journeyTextSchema,
  opportunity: journeyTextSchema
});
const customerJourneyDraftSchema = z.object({
  personaSummary: journeyTextSchema,
  journeyScenario: journeyTextSchema,
  journeySteps: z.array(customerJourneyStepSchema).min(4).max(6),
  highestPainMoment: journeyTextSchema,
  serviceOpportunities: z.array(journeyTextSchema).min(3).max(5),
  validationQuestions: z.array(journeyTextSchema).min(3).max(6),
  mentorComment: journeyTextSchema
});

const problemStatementTextSchema = z.string().trim().min(1).max(260);
const problemStatementDraftSchema = z.object({
  problemStatement: problemStatementTextSchema,
  targetCustomer: problemStatementTextSchema,
  situation: problemStatementTextSchema,
  painPoint: problemStatementTextSchema,
  rootCause: problemStatementTextSchema,
  currentAlternative: problemStatementTextSchema,
  evidenceNeeded: z.array(problemStatementTextSchema).min(3).max(5),
  presentationSentences: z.array(problemStatementTextSchema).min(2).max(4),
  validationQuestions: z.array(problemStatementTextSchema).min(3).max(6),
  mentorComment: problemStatementTextSchema
});

const interviewTextSchema = z.string().trim().min(1).max(260);
const interviewQuestionSchema = z.object({
  question: interviewTextSchema,
  intent: interviewTextSchema,
  followUp: interviewTextSchema
});
const customerInterviewDraftSchema = z.object({
  interviewGoal: interviewTextSchema,
  targetCustomer: interviewTextSchema,
  openingScript: interviewTextSchema,
  screeningQuestions: z.array(interviewQuestionSchema).min(2).max(4),
  warmupQuestions: z.array(interviewQuestionSchema).min(2).max(4),
  problemDiscoveryQuestions: z.array(interviewQuestionSchema).min(3).max(6),
  currentAlternativeQuestions: z.array(interviewQuestionSchema).min(2).max(5),
  willingnessToPayQuestions: z.array(interviewQuestionSchema).min(2).max(4),
  closingQuestions: z.array(interviewQuestionSchema).min(2).max(4),
  avoidQuestions: z.array(interviewTextSchema).min(3).max(6),
  mentorComment: interviewTextSchema
});

const surveyTextSchema = z.string().trim().min(1).max(260);
const surveyQuestionTypeSchema = z.enum(["single_choice", "multiple_choice", "scale", "short_answer"]);
const surveyQuestionSchema = z.object({
  type: surveyQuestionTypeSchema,
  question: surveyTextSchema,
  purpose: surveyTextSchema,
  options: z.array(surveyTextSchema).min(0).max(8),
  required: z.boolean()
});
const customerSurveyDraftSchema = z.object({
  surveyGoal: surveyTextSchema,
  targetRespondent: surveyTextSchema,
  introMessage: surveyTextSchema,
  estimatedTime: surveyTextSchema,
  screeningQuestions: z.array(surveyQuestionSchema).min(2).max(4),
  problemValidationQuestions: z.array(surveyQuestionSchema).min(3).max(6),
  currentAlternativeQuestions: z.array(surveyQuestionSchema).min(2).max(5),
  willingnessToPayQuestions: z.array(surveyQuestionSchema).min(2).max(4),
  demographicQuestions: z.array(surveyQuestionSchema).min(2).max(5),
  analysisGuide: z.array(surveyTextSchema).min(3).max(6),
  avoidNotes: z.array(surveyTextSchema).min(3).max(6),
  mentorComment: surveyTextSchema
});

function truncateByCharacters(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join("");
}

export function buildLeanCanvasPrompt(input: ParticipantInput) {
  return [
    "너는 창업교육 현장의 린캔버스 멘토다.",
    "참가자 입력을 바탕으로 발표에 바로 쓸 수 있는 린캔버스 초안을 작성하라.",
    "반드시 JSON만 반환하라. 코드블록, 설명, 마크다운, 주석을 절대 포함하지 마라.",
    "모든 값은 문자열 배열이어야 한다.",
    "각 필드는 2~3개의 짧은 bullet 문장으로 구성하라.",
    "각 bullet은 한국어 기준 35자 이내로 작성하라.",
    "긴 문장, 추상적 표현, 과장된 표현을 피하라.",
    "입력이 부족하면 합리적인 가정을 하되 구체적으로 작성하라.",
    "",
    "반환 JSON 키:",
    requiredKeys.join(", "),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function extractJsonObject(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function normalizeBulletArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((item) => item.replace(/^[-•]\s*/, ""))
      .map((item) => truncateByCharacters(item, MAX_CANVAS_BULLET_LENGTH))
      .slice(0, 3);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|•|- /)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^[-•]\s*/, ""))
      .map((item) => truncateByCharacters(item, MAX_CANVAS_BULLET_LENGTH))
      .slice(0, 3);
  }

  return [];
}

function normalizeStringArray(value: unknown, fallback: string[], maxItems: number, maxLength: number): string[] {
  const items = Array.isArray(value)
    ? value.map((item) => String(item))
    : typeof value === "string"
      ? value.split(/\n| - /)
      : [];

  const normalized = items
    .map((item) => item.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean)
    .map((item) => truncateByCharacters(item, maxLength))
    .slice(0, maxItems);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeText(value: unknown, fallback = "추가 작성 필요") {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join("\n") || fallback;
  if (typeof value === "string") return value.trim() || fallback;
  return fallback;
}

function normalizeScore(value: unknown, fallback = 50) {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL_NAME || DEFAULT_AI_MODEL;
  const fallbackModel =
    process.env.AI_FALLBACK_MODEL_NAME ||
    (baseUrl?.includes("integrate.api.nvidia.com") ? DEFAULT_NVIDIA_FALLBACK_MODEL : "");

  if (!apiKey || !baseUrl) {
    throw new Error(".env.local에 AI_API_KEY, AI_BASE_URL을 설정하세요.");
  }

  return { apiKey, baseUrl, model, fallbackModel };
}

function getChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

function getModelCandidates(model: string, fallbackModel?: string) {
  return [model, fallbackModel].filter((item, index, items): item is string => Boolean(item) && items.indexOf(item) === index);
}

export function parseCanvasJson(raw: string): LeanCanvasDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof LeanCanvasDraft, unknown>>;
  const result: LeanCanvasDraft = { ...emptyCanvasDraft };

  for (const key of requiredKeys) {
    const items = normalizeBulletArray(parsed[key]);
    result[key] = items.length > 0 ? items : ["추가 작성 필요"];
  }

  return leanCanvasDraftSchema.parse(result);
}

export function createMockCanvas(input: ParticipantInput): LeanCanvasDraft {
  const customer = input.targetCustomer || "초기 창업교육 참가자";
  const idea = input.ideaName || "신규 서비스";
  return {
    problem: [input.problemToSolve || "핵심 문제 정의가 부족함", "고객 검증 자료가 부족함"],
    existingAlternatives: [input.existingAlternative || "수작업 자료 정리", "멘토 피드백 의존"],
    customerSegments: [customer, "빠른 초안이 필요한 팀"],
    uniqueValueProposition: [input.ideaSummary || `${idea} 초안을 빠르게 완성`, "발표용 문장으로 정리"],
    solution: [input.ourSolution || "입력 기반 초안 자동 생성", "수정 가능한 캔버스 제공"],
    channels: ["교육 현장 워크숍", "온라인 과제 제출"],
    revenueStreams: [input.revenueModel || "교육기관 사용료", "프로그램별 라이선스"],
    costStructure: ["AI API 사용 비용", "운영 및 유지보수 비용"],
    keyMetrics: ["초안 생성 완료율", "제출까지 걸린 시간"],
    unfairAdvantage: [input.differentiation || "현장 맞춤 템플릿", "한글 인쇄 최적화"],
    mentorComment: ["고객 문제를 더 검증하세요", "핵심 지표를 수치화하세요"]
  };
}

export function buildOneLineIdeaPrompt(input: OneLineIdeaInput) {
  return [
    "너는 창업교육 현장에서 참가자의 아이디어를 발표 가능한 한 줄 문장으로 다듬는 멘토다.",
    "참가자가 적은 메모가 부족해도 합리적인 가정을 사용해 구체적인 초안을 만들어라.",
    "단, 참가자 입력에 없는 전혀 다른 산업, 고객, 제품으로 바꾸지 마라.",
    "rawIdea에 포함된 핵심 명사와 의도는 반드시 결과에 반영하라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "문장은 한국어로 작성하고, 추상적인 표현보다 고객, 문제, 해결 방식이 드러나게 써라.",
    "primaryOneLine은 '무엇을 누구에게 어떻게 제공하는지'가 한 문장에 보이게 60자 안팎으로 작성하라.",
    "alternatives는 발표자가 고를 수 있는 다른 한 줄 문장 2~4개로 작성하라.",
    "nextQuestions는 다음 작성 단계에서 확인할 질문 2~5개로 작성하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        primaryOneLine: "대표 한 줄 아이디어",
        alternatives: ["대안 문장 1", "대안 문장 2"],
        targetCustomer: "핵심 고객",
        problem: "고객의 핵심 문제",
        solution: "우리의 해결 방식",
        valueProposition: "고객이 얻는 핵심 가치",
        pitchTip: "발표 때 강조할 한 문장 팁",
        nextQuestions: ["다음에 확인할 질문 1", "다음에 확인할 질문 2"],
        mentorComment: "멘토 코멘트"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export function parseOneLineIdeaJson(raw: string): OneLineIdeaDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof OneLineIdeaDraft, unknown>>;
  const draft: OneLineIdeaDraft = {
    primaryOneLine: truncateByCharacters(normalizeText(parsed.primaryOneLine, "고객 문제를 해결하는 한 줄 아이디어"), 120),
    alternatives: normalizeStringArray(
      parsed.alternatives,
      ["고객의 반복 문제를 줄이는 서비스", "현장에서 바로 쓰는 해결 도구"],
      4,
      120
    ),
    targetCustomer: truncateByCharacters(normalizeText(parsed.targetCustomer, "초기 핵심 고객"), 120),
    problem: truncateByCharacters(normalizeText(parsed.problem, "반복해서 겪는 불편"), 140),
    solution: truncateByCharacters(normalizeText(parsed.solution, "간단히 실행 가능한 해결책"), 140),
    valueProposition: truncateByCharacters(normalizeText(parsed.valueProposition, "시간과 시행착오를 줄이는 가치"), 140),
    pitchTip: truncateByCharacters(normalizeText(parsed.pitchTip, "고객과 문제를 먼저 말하세요."), 160),
    nextQuestions: normalizeStringArray(
      parsed.nextQuestions,
      ["가장 먼저 만날 고객은 누구인가요?", "고객이 지금 쓰는 대안은 무엇인가요?"],
      5,
      140
    ),
    mentorComment: truncateByCharacters(normalizeText(parsed.mentorComment, "고객과 문제를 더 구체화하면 좋습니다."), 180)
  };

  return oneLineIdeaDraftSchema.parse(draft);
}

export function createMockOneLineIdeaDraft(input: OneLineIdeaInput): OneLineIdeaDraft {
  const rawIdea = input.rawIdea.trim() || "창업교육 참가자의 아이디어";
  const teamName = input.teamName || "우리 팀";
  const customer = rawIdea.includes("학생") ? "과제와 진로를 준비하는 학생" : "반복 업무로 시간이 부족한 고객";

  return {
    primaryOneLine: `${teamName}은 ${customer}에게 ${truncateByCharacters(rawIdea, 28)}을 더 쉽게 실행하게 돕습니다.`,
    alternatives: [
      `${customer}의 반복 시행착오를 줄이는 실행 도구`,
      `초기 사용자가 바로 이해하는 ${truncateByCharacters(rawIdea, 24)} 서비스`
    ],
    targetCustomer: customer,
    problem: "현재 방법은 시간이 오래 걸리고 결과를 확신하기 어렵습니다.",
    solution: "입력한 상황을 바탕으로 바로 실행할 초안을 제공합니다.",
    valueProposition: "처음부터 완성도 있는 문장으로 발표 준비 시간을 줄입니다.",
    pitchTip: "첫 문장은 고객, 문제, 해결책 순서로 짧게 말하세요.",
    nextQuestions: ["가장 절박한 고객은 누구인가요?", "고객이 지금 쓰는 대안은 무엇인가요?", "첫 검증은 어떻게 할 수 있나요?"],
    mentorComment: "고객 범위를 한 단계 더 좁히면 한 줄 문장이 더 강해집니다."
  };
}

export function buildIdeaDiagnosisPrompt(input: IdeaDiagnosisInput) {
  return [
    "너는 창업교육 현장에서 초기 아이디어를 사전진단하는 멘토다.",
    "참가자의 아이디어를 문제성, 고객성, 시장성, 실현가능성 기준으로 진단하라.",
    "진단은 참가자가 바로 다음 행동을 정할 수 있게 구체적이어야 한다.",
    "아이디어가 부족해도 합리적으로 가정하되, 참가자 입력과 무관한 새 아이템으로 바꾸지 마라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "점수는 0~100 정수로 작성하라. 너무 후하게 주지 말고 초기 아이디어 기준으로 현실적으로 평가하라.",
    "reason은 왜 그 점수인지, improvement는 무엇을 보완해야 하는지 한 문장으로 작성하라.",
    "strengths, risks, nextActions는 발표와 멘토링에서 바로 쓸 수 있는 짧은 문장으로 작성하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        overallScore: 68,
        summary: "아이디어의 현재 진단 요약",
        problemFit: { score: 70, reason: "문제성 판단 이유", improvement: "문제성 보완 액션" },
        customerFit: { score: 65, reason: "고객성 판단 이유", improvement: "고객성 보완 액션" },
        marketFit: { score: 60, reason: "시장성 판단 이유", improvement: "시장성 보완 액션" },
        feasibility: { score: 72, reason: "실현가능성 판단 이유", improvement: "실현가능성 보완 액션" },
        strengths: ["강점 1", "강점 2"],
        risks: ["위험요소 1", "위험요소 2"],
        nextActions: ["다음 행동 1", "다음 행동 2", "다음 행동 3"],
        mentorComment: "멘토 코멘트"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function normalizeDiagnosisScore(
  value: unknown,
  fallback: { score: number; reason: string; improvement: string }
): IdeaDiagnosisDraft["problemFit"] {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    score: normalizeScore(source.score, fallback.score),
    reason: truncateByCharacters(normalizeText(source.reason, fallback.reason), 220),
    improvement: truncateByCharacters(normalizeText(source.improvement, fallback.improvement), 220)
  };
}

export function parseIdeaDiagnosisJson(raw: string): IdeaDiagnosisDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof IdeaDiagnosisDraft, unknown>>;
  const draft: IdeaDiagnosisDraft = {
    overallScore: normalizeScore(parsed.overallScore, 60),
    summary: truncateByCharacters(normalizeText(parsed.summary, "초기 아이디어로서 고객과 문제를 더 구체화해야 합니다."), 220),
    problemFit: normalizeDiagnosisScore(parsed.problemFit, {
      score: 60,
      reason: "문제가 존재하지만 구체적인 상황이 더 필요합니다.",
      improvement: "고객이 언제, 왜 불편한지 사례를 3개 모으세요."
    }),
    customerFit: normalizeDiagnosisScore(parsed.customerFit, {
      score: 60,
      reason: "고객군이 보이지만 범위가 넓습니다.",
      improvement: "가장 먼저 만날 고객을 한 문장으로 좁히세요."
    }),
    marketFit: normalizeDiagnosisScore(parsed.marketFit, {
      score: 55,
      reason: "시장 가능성은 있으나 규모와 대안 확인이 필요합니다.",
      improvement: "현재 대안과 지불 의사를 빠르게 확인하세요."
    }),
    feasibility: normalizeDiagnosisScore(parsed.feasibility, {
      score: 65,
      reason: "작게 실험할 수 있는 가능성이 있습니다.",
      improvement: "1주 안에 만들 수 있는 MVP 범위를 정하세요."
    }),
    strengths: normalizeStringArray(parsed.strengths, ["문제 접근이 쉽습니다.", "초기 실험을 설계하기 좋습니다."], 4, 180),
    risks: normalizeStringArray(parsed.risks, ["고객 범위가 넓을 수 있습니다.", "실제 지불 의사 확인이 필요합니다."], 4, 180),
    nextActions: normalizeStringArray(
      parsed.nextActions,
      ["핵심 고객 5명을 인터뷰하세요.", "현재 대안을 조사하세요.", "1주 MVP 실험을 정하세요."],
      5,
      180
    ),
    mentorComment: truncateByCharacters(normalizeText(parsed.mentorComment, "고객과 문제를 더 좁히면 다음 단계로 진행하기 좋습니다."), 220)
  };

  return ideaDiagnosisDraftSchema.parse(draft);
}

export function createMockIdeaDiagnosisDraft(input: IdeaDiagnosisInput): IdeaDiagnosisDraft {
  const idea = input.oneLineIdea || input.ideaMemo || "초기 창업 아이디어";
  return {
    overallScore: 64,
    summary: `${truncateByCharacters(idea, 42)}은 초기 검증 가능성이 있으나 고객 범위와 지불 의사 확인이 필요합니다.`,
    problemFit: {
      score: 68,
      reason: "불편 상황은 보이지만 빈도와 강도가 아직 명확하지 않습니다.",
      improvement: "고객이 겪은 최근 사례와 손실 시간을 숫자로 모으세요."
    },
    customerFit: {
      score: 62,
      reason: "대상 고객은 보이지만 첫 고객군이 넓게 잡혀 있습니다.",
      improvement: "가장 절박한 고객 1명을 직업, 상황, 행동 기준으로 좁히세요."
    },
    marketFit: {
      score: 58,
      reason: "수요 가능성은 있으나 대안과 지불 방식 확인이 필요합니다.",
      improvement: "유사 서비스 3개와 고객이 현재 쓰는 대안을 비교하세요."
    },
    feasibility: {
      score: 70,
      reason: "작은 실험으로 검증할 수 있는 형태입니다.",
      improvement: "첫 주에는 자동화 전체보다 핵심 결과물 1개만 만들어 테스트하세요."
    },
    strengths: ["문제 상황을 설명하기 쉽습니다.", "작은 MVP로 빠르게 검증할 수 있습니다."],
    risks: ["고객군이 넓으면 메시지가 흐려질 수 있습니다.", "실제 지불 의사를 확인하지 않으면 취미 수준으로 남을 수 있습니다."],
    nextActions: ["핵심 고객 5명을 인터뷰하세요.", "현재 대안과 가격을 조사하세요.", "1주 안에 보여줄 MVP 결과물을 정하세요."],
    mentorComment: "지금은 아이디어보다 고객의 반복 문제를 더 좁히는 것이 우선입니다."
  };
}

export function buildCustomerPersonaPrompt(input: CustomerPersonaInput) {
  return [
    "너는 창업교육 현장에서 초기 아이디어의 핵심 고객을 한 명의 구체적인 페르소나로 좁히는 멘토다.",
    "넓은 고객군을 만들지 말고, 실제 인터뷰할 수 있는 한 사람의 상황으로 정의하라.",
    "참가자 입력, 한 줄 아이디어, 사전진단 리포트가 있으면 모두 반영하라.",
    "입력이 부족해도 합리적으로 가정하되, 참가자 입력과 무관한 새 아이템이나 새 고객군으로 바꾸지 마라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "문장은 한국어로 작성하고, 창업교육 참가자가 바로 고객 인터뷰와 발표에 활용할 수 있게 구체적으로 써라.",
    "interviewQuestions는 예/아니오 질문보다 경험과 행동을 묻는 질문으로 작성하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        personaName: "페르소나 이름",
        personaSummary: "한 문장 페르소나 요약",
        demographic: "나이, 직업, 생활권 등 기본 특성",
        situation: "문제를 겪는 구체적인 상황",
        jobToBeDone: "이 고객이 해결하려는 일",
        painPoints: ["고통점 1", "고통점 2"],
        currentAlternatives: ["현재 대안 1", "현재 대안 2"],
        buyingTriggers: ["구매/사용 계기 1", "구매/사용 계기 2"],
        objections: ["도입을 망설이는 이유 1", "도입을 망설이는 이유 2"],
        channels: ["만날 수 있는 채널 1", "만날 수 있는 채널 2"],
        interviewQuestions: ["인터뷰 질문 1", "인터뷰 질문 2", "인터뷰 질문 3", "인터뷰 질문 4"],
        mentorComment: "멘토 코멘트"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export function parseCustomerPersonaJson(raw: string): CustomerPersonaDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof CustomerPersonaDraft, unknown>>;
  const draft: CustomerPersonaDraft = {
    personaName: truncateByCharacters(normalizeText(parsed.personaName, "첫 번째 핵심 고객"), 120),
    personaSummary: truncateByCharacters(
      normalizeText(parsed.personaSummary, "반복 문제를 겪고 빠른 해결책을 찾는 초기 고객입니다."),
      220
    ),
    demographic: truncateByCharacters(normalizeText(parsed.demographic, "20~30대 초기 사용자, 모바일 사용에 익숙함"), 220),
    situation: truncateByCharacters(normalizeText(parsed.situation, "문제를 반복해서 겪지만 적절한 대안을 찾지 못하는 상황"), 220),
    jobToBeDone: truncateByCharacters(normalizeText(parsed.jobToBeDone, "시간과 시행착오를 줄이고 원하는 결과를 얻고 싶다."), 220),
    painPoints: normalizeStringArray(parsed.painPoints, ["현재 방법이 번거롭습니다.", "결과를 확신하기 어렵습니다."], 5, 180),
    currentAlternatives: normalizeStringArray(parsed.currentAlternatives, ["수작업으로 해결합니다.", "주변 추천이나 검색에 의존합니다."], 5, 180),
    buyingTriggers: normalizeStringArray(parsed.buyingTriggers, ["시간이 부족할 때 사용합니다.", "반복 실패를 겪었을 때 필요를 느낍니다."], 5, 180),
    objections: normalizeStringArray(parsed.objections, ["가격이 부담될 수 있습니다.", "실제로 편한지 확신하지 못할 수 있습니다."], 5, 180),
    channels: normalizeStringArray(parsed.channels, ["온라인 커뮤니티", "교육 현장 또는 학교 커뮤니티"], 5, 180),
    interviewQuestions: normalizeStringArray(
      parsed.interviewQuestions,
      ["최근 이 문제를 겪은 상황을 알려주세요.", "지금은 어떤 방법으로 해결하고 있나요?", "그 방법에서 가장 불편한 점은 무엇인가요?", "어떤 조건이면 새 해결책을 써볼까요?"],
      7,
      180
    ),
    mentorComment: truncateByCharacters(normalizeText(parsed.mentorComment, "첫 고객을 더 좁혀 인터뷰하면 다음 단계가 선명해집니다."), 220)
  };

  return customerPersonaDraftSchema.parse(draft);
}

export function createMockCustomerPersonaDraft(input: CustomerPersonaInput): CustomerPersonaDraft {
  const idea = input.oneLineIdea || input.ideaMemo || "초기 창업 아이디어";
  return {
    personaName: "혼자 해결하려다 막히는 초기 고객",
    personaSummary: `${truncateByCharacters(idea, 38)}에 관심이 있지만 현재 대안에 불편을 느끼는 첫 고객입니다.`,
    demographic: "20~30대, 모바일 검색과 커뮤니티 사용에 익숙하고 비용 대비 효율을 따집니다.",
    situation: "문제가 생길 때마다 검색하거나 주변에 묻지만 매번 시간이 오래 걸립니다.",
    jobToBeDone: "빠르게 믿을 만한 해결책을 찾아 시행착오 없이 원하는 결과를 얻고 싶습니다.",
    painPoints: ["현재 해결 방식이 번거롭습니다.", "시간을 써도 결과가 만족스럽지 않을 때가 많습니다.", "어떤 선택이 좋은지 확신하기 어렵습니다."],
    currentAlternatives: ["검색으로 직접 비교합니다.", "주변 지인이나 커뮤니티 추천을 참고합니다."],
    buyingTriggers: ["반복 실패로 시간이 아까울 때", "당장 해결해야 하는 일정이 있을 때", "무료 체험이나 실제 사례를 확인했을 때"],
    objections: ["가격이 비싸면 직접 해결하려고 합니다.", "정말 내 상황에 맞는지 의심할 수 있습니다."],
    channels: ["학교·지역 커뮤니티", "카카오톡 오픈채팅", "인스타그램 또는 블로그 후기"],
    interviewQuestions: [
      "최근 이 문제를 겪은 구체적인 상황을 말해주세요.",
      "그때 어떤 방법으로 해결하려고 했나요?",
      "현재 방법에서 가장 시간이 오래 걸리는 부분은 무엇인가요?",
      "돈을 내고라도 해결하고 싶은 순간은 언제인가요?"
    ],
    mentorComment: "페르소나는 넓은 집단보다 실제로 만날 수 있는 한 명으로 좁혀야 검증이 빨라집니다."
  };
}

export function buildCustomerJourneyPrompt(input: CustomerJourneyInput) {
  return [
    "너는 창업교육 현장에서 고객 여정지도를 만드는 멘토다.",
    "고객 페르소나와 아이디어를 바탕으로 고객이 문제를 인식하고 해결책을 선택하기까지의 흐름을 단계별로 정리하라.",
    "여정은 실제 인터뷰와 발표에 바로 쓸 수 있게 구체적인 행동, 접점, 감정, 고통, 기회로 나누어 작성하라.",
    "참가자 입력, 한 줄 아이디어, 사전진단 리포트, 페르소나 결과가 있으면 모두 반영하라.",
    "입력이 부족해도 합리적으로 가정하되, 참가자 입력과 무관한 새 아이템이나 새 고객군으로 바꾸지 마라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "journeySteps는 4~6단계로 작성하라. 각 단계는 짧고 구체적인 한국어 문장으로 작성하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        personaSummary: "이 여정의 기준이 되는 고객 요약",
        journeyScenario: "고객이 문제를 겪는 대표 시나리오",
        journeySteps: [
          {
            stage: "문제 인식",
            customerAction: "고객 행동",
            touchpoint: "접점",
            emotion: "감정",
            painPoint: "고통점",
            opportunity: "서비스 기회"
          }
        ],
        highestPainMoment: "가장 고통이 큰 순간",
        serviceOpportunities: ["기회 1", "기회 2", "기회 3"],
        validationQuestions: ["검증 질문 1", "검증 질문 2", "검증 질문 3"],
        mentorComment: "멘토 코멘트"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function normalizeJourneySteps(value: unknown): CustomerJourneyDraft["journeySteps"] {
  const fallback = [
    {
      stage: "문제 인식",
      customerAction: "반복되는 불편을 다시 경험합니다.",
      touchpoint: "일상 상황",
      emotion: "답답함",
      painPoint: "현재 방법으로는 빠르게 해결하기 어렵습니다.",
      opportunity: "문제 상황을 쉽게 기록하게 합니다."
    },
    {
      stage: "대안 탐색",
      customerAction: "검색하거나 주변에 물어봅니다.",
      touchpoint: "검색, 커뮤니티, 지인",
      emotion: "불확실함",
      painPoint: "정보가 많지만 내 상황에 맞는지 모르겠습니다.",
      opportunity: "맞춤형 비교와 추천 근거를 제공합니다."
    },
    {
      stage: "첫 시도",
      customerAction: "가장 쉬운 방법을 한번 시도합니다.",
      touchpoint: "모바일 화면 또는 오프라인 접점",
      emotion: "기대와 의심",
      painPoint: "사용 전 효과를 확신하기 어렵습니다.",
      opportunity: "작은 무료 체험이나 결과 예시를 보여줍니다."
    },
    {
      stage: "선택",
      customerAction: "시간과 비용을 비교해 사용할지 결정합니다.",
      touchpoint: "가격, 후기, 추천",
      emotion: "신중함",
      painPoint: "비용 대비 효과가 불명확합니다.",
      opportunity: "성과 기준과 후기를 명확히 제시합니다."
    }
  ];

  if (!Array.isArray(value)) return fallback;
  const steps = value
    .map((item) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        stage: truncateByCharacters(normalizeText(source.stage, "단계"), 80),
        customerAction: truncateByCharacters(normalizeText(source.customerAction, "고객 행동을 정리하세요."), 180),
        touchpoint: truncateByCharacters(normalizeText(source.touchpoint, "접점"), 120),
        emotion: truncateByCharacters(normalizeText(source.emotion, "감정"), 80),
        painPoint: truncateByCharacters(normalizeText(source.painPoint, "고통점"), 180),
        opportunity: truncateByCharacters(normalizeText(source.opportunity, "서비스 기회"), 180)
      };
    })
    .slice(0, 6);

  return steps.length >= 4 ? steps : fallback;
}

export function parseCustomerJourneyJson(raw: string): CustomerJourneyDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof CustomerJourneyDraft, unknown>>;
  const draft: CustomerJourneyDraft = {
    personaSummary: truncateByCharacters(normalizeText(parsed.personaSummary, "핵심 고객의 대표 상황을 정리하세요."), 220),
    journeyScenario: truncateByCharacters(normalizeText(parsed.journeyScenario, "고객이 문제를 겪고 해결책을 찾는 흐름입니다."), 220),
    journeySteps: normalizeJourneySteps(parsed.journeySteps),
    highestPainMoment: truncateByCharacters(normalizeText(parsed.highestPainMoment, "대안 탐색 중 확신이 없는 순간"), 220),
    serviceOpportunities: normalizeStringArray(
      parsed.serviceOpportunities,
      ["문제 상황을 빠르게 인식하게 합니다.", "대안을 비교하기 쉽게 만듭니다.", "첫 사용 장벽을 낮춥니다."],
      5,
      180
    ),
    validationQuestions: normalizeStringArray(
      parsed.validationQuestions,
      ["최근 이 문제를 겪은 흐름을 순서대로 말해주세요.", "가장 답답했던 순간은 언제였나요?", "현재 어떤 접점에서 대안을 찾나요?"],
      6,
      180
    ),
    mentorComment: truncateByCharacters(normalizeText(parsed.mentorComment, "가장 고통이 큰 순간을 기준으로 MVP를 설계하세요."), 220)
  };

  return customerJourneyDraftSchema.parse(draft);
}

export function createMockCustomerJourneyDraft(input: CustomerJourneyInput): CustomerJourneyDraft {
  const persona = input.personaReport || input.oneLineIdea || input.ideaMemo || "핵심 고객";
  return {
    personaSummary: `${truncateByCharacters(persona, 70)}를 기준으로 고객 여정을 정리합니다.`,
    journeyScenario: "고객이 반복 문제를 겪고 현재 대안을 찾아보다가 더 쉬운 해결책을 검토하는 흐름입니다.",
    journeySteps: normalizeJourneySteps([]),
    highestPainMoment: "현재 대안을 찾아도 내 상황에 맞는지 확신하지 못하는 순간입니다.",
    serviceOpportunities: ["문제 상황을 쉽게 기록하게 합니다.", "현재 대안과 차이를 한눈에 보여줍니다.", "첫 사용 결과를 빠르게 경험하게 합니다."],
    validationQuestions: [
      "최근 이 문제를 겪은 하루를 순서대로 설명해주세요.",
      "가장 답답했던 순간은 어느 단계였나요?",
      "지금은 어떤 채널에서 해결책을 찾나요?",
      "새 해결책을 써보려면 어떤 증거가 필요할까요?"
    ],
    mentorComment: "여정지도는 기능 목록보다 고객의 행동 순서를 먼저 보는 도구입니다."
  };
}

export function buildProblemStatementPrompt(input: ProblemStatementInput) {
  return [
    "너는 창업교육 현장에서 참가자의 아이디어를 발표 가능한 문제정의문으로 정리하는 멘토다.",
    "참가자 입력과 이전 모듈 결과를 바탕으로 고객, 상황, 고통, 원인, 기존 대안의 한계를 구체적으로 정리하라.",
    "문제정의문은 '누가 / 어떤 상황에서 / 무엇 때문에 / 어떤 손해를 겪는지'가 한 문장 안에 드러나야 한다.",
    "해결책을 홍보하지 말고, 고객 문제가 실제로 존재하는지 검증 가능한 형태로 작성하라.",
    "입력이 부족하면 합리적으로 가정하되, 참가자 입력의 고객과 문제를 임의의 다른 사업으로 바꾸지 마라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "모든 문장은 한국어로 짧고 발표자가 바로 읽을 수 있게 작성하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        problemStatement: "발표용 한 문장 문제정의",
        targetCustomer: "가장 먼저 검증할 고객",
        situation: "문제가 발생하는 구체적 상황",
        painPoint: "고객이 겪는 핵심 고통",
        rootCause: "문제가 반복되는 근본 원인",
        currentAlternative: "현재 대안과 그 한계",
        evidenceNeeded: ["확인할 증거 1", "확인할 증거 2", "확인할 증거 3"],
        presentationSentences: ["발표 문장 1", "발표 문장 2"],
        validationQuestions: ["검증 질문 1", "검증 질문 2", "검증 질문 3"],
        mentorComment: "멘토 코멘트"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export function parseProblemStatementJson(raw: string): ProblemStatementDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof ProblemStatementDraft, unknown>>;
  const draft: ProblemStatementDraft = {
    problemStatement: truncateByCharacters(
      normalizeText(parsed.problemStatement, "고객이 반복해서 겪는 불편을 한 문장으로 더 구체화해야 합니다."),
      220
    ),
    targetCustomer: truncateByCharacters(normalizeText(parsed.targetCustomer, "가장 먼저 만날 초기 고객"), 160),
    situation: truncateByCharacters(normalizeText(parsed.situation, "문제가 발생하는 구체적 상황"), 180),
    painPoint: truncateByCharacters(normalizeText(parsed.painPoint, "고객이 겪는 핵심 고통"), 180),
    rootCause: truncateByCharacters(normalizeText(parsed.rootCause, "현재 대안으로 해결되지 않는 원인"), 180),
    currentAlternative: truncateByCharacters(normalizeText(parsed.currentAlternative, "고객이 지금 쓰는 대안과 한계"), 180),
    evidenceNeeded: normalizeStringArray(
      parsed.evidenceNeeded,
      ["문제를 최근 겪은 고객 수", "현재 대안에 쓰는 시간과 비용", "고객이 실제로 지불할 의사"],
      5,
      160
    ),
    presentationSentences: normalizeStringArray(
      parsed.presentationSentences,
      ["우리가 먼저 확인해야 할 문제는 고객이 반복해서 겪는 불편입니다.", "이 문제는 현재 대안으로 충분히 해결되지 않습니다."],
      4,
      180
    ),
    validationQuestions: normalizeStringArray(
      parsed.validationQuestions,
      ["최근 이 문제를 겪은 상황을 설명해 주세요.", "지금은 어떤 방법으로 해결하고 있나요?", "그 방법에서 가장 불편한 점은 무엇인가요?"],
      6,
      180
    ),
    mentorComment: truncateByCharacters(
      normalizeText(parsed.mentorComment, "문제정의문은 고객 인터뷰에서 바로 검증할 수 있는 문장으로 다듬어 보세요."),
      220
    )
  };

  return problemStatementDraftSchema.parse(draft);
}

export function createMockProblemStatementDraft(input: ProblemStatementInput): ProblemStatementDraft {
  const idea = input.oneLineIdea || input.ideaMemo || "초기 창업 아이디어";
  const customer = idea.includes("자취") ? "밤늦게 식사를 해결해야 하는 자취생" : "반복되는 불편을 직접 겪는 초기 고객";
  return {
    problemStatement: `${customer}은 현재 대안으로 ${truncateByCharacters(idea, 32)} 문제를 빠르게 해결하지 못해 시간과 비용 부담을 겪습니다.`,
    targetCustomer: customer,
    situation: "문제가 반복되는 순간에 고객은 검색, 주변 추천, 임시 대안에 의존합니다.",
    painPoint: "고객은 원하는 결과를 얻기까지 시간이 오래 걸리고 실패 가능성을 줄이기 어렵습니다.",
    rootCause: "기존 대안은 고객의 구체적 상황과 긴급도를 충분히 반영하지 못합니다.",
    currentAlternative: "고객은 직접 검색하거나 주변 조언을 참고하지만, 선택 기준이 분명하지 않습니다.",
    evidenceNeeded: ["최근 7일 안에 같은 문제를 겪은 고객 수", "현재 대안에 쓰는 시간과 비용", "고객이 문제 해결을 위해 실제로 지불할 금액"],
    presentationSentences: [
      `${customer}은 이 문제를 해결하려고 기존 대안을 쓰지만 만족스러운 결과를 얻기 어렵습니다.`,
      "우리는 이 문제가 얼마나 자주 반복되고, 고객이 어떤 대안에 비용을 쓰는지 먼저 검증하려 합니다."
    ],
    validationQuestions: [
      "최근 이 문제를 겪은 상황을 구체적으로 말해 주세요.",
      "그때 어떤 방법으로 해결하려고 했나요?",
      "현재 방법에서 가장 불편하거나 아쉬운 점은 무엇인가요?",
      "이 문제가 해결된다면 어느 정도 비용을 지불할 의사가 있나요?"
    ],
    mentorComment: "문제정의문은 해결책 설명보다 고객의 반복 불편과 기존 대안의 한계를 먼저 보여줄수록 강해집니다."
  };
}

export function buildCustomerInterviewPrompt(input: CustomerInterviewInput) {
  return [
    "너는 창업교육 현장에서 참가자가 고객 인터뷰를 바로 진행할 수 있게 질문지를 만드는 멘토다.",
    "참가자 입력과 이전 모듈 결과를 바탕으로 실제 고객에게 물어볼 비유도형 질문을 설계하라.",
    "질문은 해결책을 설명하거나 구매를 유도하지 말고, 고객의 최근 경험과 현재 대안을 확인하는 방식이어야 한다.",
    "각 질문에는 질문 의도와 바로 이어서 물을 꼬리질문을 포함하라.",
    "문제정의문이 있으면 그 문제를 검증하는 질문을 우선하고, 없으면 참가자 메모에서 가장 구체적인 고객 문제를 기준으로 작성하라.",
    "입력이 부족하면 합리적으로 가정하되, 참가자 입력의 고객과 문제를 임의의 다른 사업으로 바꾸지 마라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "모든 문장은 한국어로 짧고 현장 인터뷰에서 그대로 읽을 수 있게 작성하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        interviewGoal: "이번 인터뷰에서 확인할 핵심 목표",
        targetCustomer: "인터뷰할 고객 조건",
        openingScript: "30초 오프닝 멘트",
        screeningQuestions: [{ question: "선별 질문", intent: "질문 의도", followUp: "꼬리질문" }],
        warmupQuestions: [{ question: "가벼운 시작 질문", intent: "질문 의도", followUp: "꼬리질문" }],
        problemDiscoveryQuestions: [{ question: "문제 발견 질문", intent: "질문 의도", followUp: "꼬리질문" }],
        currentAlternativeQuestions: [{ question: "현재 대안 질문", intent: "질문 의도", followUp: "꼬리질문" }],
        willingnessToPayQuestions: [{ question: "지불의사 질문", intent: "질문 의도", followUp: "꼬리질문" }],
        closingQuestions: [{ question: "마무리 질문", intent: "질문 의도", followUp: "꼬리질문" }],
        avoidQuestions: ["피해야 할 질문 1", "피해야 할 질문 2", "피해야 할 질문 3"],
        mentorComment: "인터뷰 진행 팁"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function normalizeInterviewQuestions(
  value: unknown,
  fallback: CustomerInterviewDraft["screeningQuestions"],
  minItems: number,
  maxItems: number
): CustomerInterviewDraft["screeningQuestions"] {
  const normalized = Array.isArray(value)
    ? value
        .map((item) => {
          if (item && typeof item === "object") {
            const source = item as Record<string, unknown>;
            return {
              question: truncateByCharacters(normalizeText(source.question, "최근 이 문제를 겪은 적이 있나요?"), 180),
              intent: truncateByCharacters(normalizeText(source.intent, "실제 경험 여부를 확인합니다."), 160),
              followUp: truncateByCharacters(normalizeText(source.followUp, "그 상황을 조금 더 자세히 말해 주세요."), 180)
            };
          }

          return {
            question: truncateByCharacters(normalizeText(item, "최근 이 문제를 겪은 적이 있나요?"), 180),
            intent: "실제 경험 여부를 확인합니다.",
            followUp: "그 상황을 조금 더 자세히 말해 주세요."
          };
        })
        .filter((item) => item.question)
        .slice(0, maxItems)
    : [];

  return normalized.length >= minItems ? normalized : fallback;
}

export function parseCustomerInterviewJson(raw: string): CustomerInterviewDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof CustomerInterviewDraft, unknown>>;
  const draft: CustomerInterviewDraft = {
    interviewGoal: truncateByCharacters(normalizeText(parsed.interviewGoal, "고객 문제가 실제로 반복되는지 확인합니다."), 220),
    targetCustomer: truncateByCharacters(normalizeText(parsed.targetCustomer, "최근 2주 안에 문제를 겪은 초기 고객"), 180),
    openingScript: truncateByCharacters(
      normalizeText(parsed.openingScript, "저희는 창업교육 과정에서 고객 문제를 검증하고 있습니다. 정답은 없고 최근 경험을 편하게 말씀해 주세요."),
      240
    ),
    screeningQuestions: normalizeInterviewQuestions(
      parsed.screeningQuestions,
      [
        {
          question: "최근 2주 안에 이 문제를 직접 겪은 적이 있나요?",
          intent: "인터뷰 대상 적합성을 확인합니다.",
          followUp: "가장 최근 상황은 언제였나요?"
        },
        {
          question: "그 문제를 본인이 직접 해결해야 했나요?",
          intent: "실제 의사결정자인지 확인합니다.",
          followUp: "누가 최종 선택을 했나요?"
        }
      ],
      2,
      4
    ),
    warmupQuestions: normalizeInterviewQuestions(
      parsed.warmupQuestions,
      [
        {
          question: "평소 이 상황이 생기면 가장 먼저 무엇을 하나요?",
          intent: "자연스러운 행동 흐름을 파악합니다.",
          followUp: "그 다음에는 어떤 선택지를 확인하나요?"
        },
        {
          question: "최근 가장 기억나는 사례를 말해 주세요.",
          intent: "구체적 경험을 끌어냅니다.",
          followUp: "그때 어디에 있었고 누구와 있었나요?"
        }
      ],
      2,
      4
    ),
    problemDiscoveryQuestions: normalizeInterviewQuestions(
      parsed.problemDiscoveryQuestions,
      [
        {
          question: "그 상황에서 가장 불편했던 점은 무엇이었나요?",
          intent: "핵심 고통을 확인합니다.",
          followUp: "왜 그 부분이 특히 불편했나요?"
        },
        {
          question: "그 문제가 얼마나 자주 반복되나요?",
          intent: "문제 빈도를 확인합니다.",
          followUp: "최근 한 달 기준으로 몇 번 정도였나요?"
        },
        {
          question: "문제가 해결되지 않으면 어떤 손해가 생기나요?",
          intent: "문제의 강도를 확인합니다.",
          followUp: "시간, 비용, 감정 중 무엇이 가장 컸나요?"
        }
      ],
      3,
      6
    ),
    currentAlternativeQuestions: normalizeInterviewQuestions(
      parsed.currentAlternativeQuestions,
      [
        {
          question: "지금은 어떤 방법으로 해결하고 있나요?",
          intent: "현재 대안을 확인합니다.",
          followUp: "그 방법을 선택한 이유는 무엇인가요?"
        },
        {
          question: "현재 방법에서 가장 아쉬운 점은 무엇인가요?",
          intent: "기존 대안의 한계를 찾습니다.",
          followUp: "그 한계를 줄이려고 해본 일이 있나요?"
        }
      ],
      2,
      5
    ),
    willingnessToPayQuestions: normalizeInterviewQuestions(
      parsed.willingnessToPayQuestions,
      [
        {
          question: "이 문제가 더 잘 해결된다면 어떤 결과를 기대하나요?",
          intent: "가치 기준을 확인합니다.",
          followUp: "그 결과를 위해 시간이나 비용을 쓸 의사가 있나요?"
        },
        {
          question: "현재 해결을 위해 이미 돈이나 시간을 쓰고 있나요?",
          intent: "실제 지불 행동을 확인합니다.",
          followUp: "대략 어느 정도 쓰고 있나요?"
        }
      ],
      2,
      4
    ),
    closingQuestions: normalizeInterviewQuestions(
      parsed.closingQuestions,
      [
        {
          question: "이 문제를 겪는 다른 사람을 소개해 주실 수 있나요?",
          intent: "추가 인터뷰 대상을 찾습니다.",
          followUp: "어떤 분이 비슷한 상황을 자주 겪나요?"
        },
        {
          question: "오늘 질문 중 더 말하고 싶은 부분이 있나요?",
          intent: "빠진 맥락을 확인합니다.",
          followUp: "그 부분이 중요한 이유는 무엇인가요?"
        }
      ],
      2,
      4
    ),
    avoidQuestions: normalizeStringArray(
      parsed.avoidQuestions,
      ["저희 서비스가 있으면 쓰실래요?", "이 아이디어 괜찮아 보이나요?", "얼마면 구매하시겠어요?"],
      6,
      160
    ),
    mentorComment: truncateByCharacters(
      normalizeText(parsed.mentorComment, "인터뷰에서는 의견보다 최근 실제 행동을 묻는 질문이 더 강합니다."),
      220
    )
  };

  return customerInterviewDraftSchema.parse(draft);
}

export function createMockCustomerInterviewDraft(input: CustomerInterviewInput): CustomerInterviewDraft {
  const problem = input.problemStatementReport || input.journeyReport || input.ideaMemo || "고객이 반복해서 겪는 문제";
  const targetCustomer = problem.includes("자취") ? "최근 2주 안에 늦은 시간 식사를 고민한 자취생" : "최근 2주 안에 해당 문제를 직접 겪은 초기 고객";
  return {
    interviewGoal: "고객이 실제로 문제를 반복해서 겪는지, 현재 대안에 어떤 한계가 있는지 확인합니다.",
    targetCustomer,
    openingScript: "안녕하세요. 저희는 창업교육 과정에서 고객 문제를 검증하고 있습니다. 정답은 없고 최근 경험을 편하게 말씀해 주시면 됩니다.",
    screeningQuestions: [
      {
        question: "최근 2주 안에 이 문제를 직접 겪은 적이 있나요?",
        intent: "인터뷰 대상 적합성을 확인합니다.",
        followUp: "가장 최근에 겪은 날은 언제였나요?"
      },
      {
        question: "그 문제를 본인이 직접 해결해야 했나요?",
        intent: "실제 의사결정자인지 확인합니다.",
        followUp: "누가 최종 선택을 했나요?"
      }
    ],
    warmupQuestions: [
      {
        question: "평소 이 상황이 생기면 가장 먼저 무엇을 하나요?",
        intent: "자연스러운 행동 흐름을 파악합니다.",
        followUp: "그 다음에는 어떤 선택지를 확인하나요?"
      },
      {
        question: "최근 가장 기억나는 사례를 말해 주세요.",
        intent: "구체적 경험을 끌어냅니다.",
        followUp: "그때 어디에 있었고 어떤 상황이었나요?"
      }
    ],
    problemDiscoveryQuestions: [
      {
        question: "그 상황에서 가장 불편했던 점은 무엇이었나요?",
        intent: "핵심 고통을 확인합니다.",
        followUp: "왜 그 부분이 특히 불편했나요?"
      },
      {
        question: "이 문제가 얼마나 자주 반복되나요?",
        intent: "문제 빈도를 확인합니다.",
        followUp: "최근 한 달 기준으로 몇 번 정도였나요?"
      },
      {
        question: "문제가 해결되지 않으면 어떤 손해가 생기나요?",
        intent: "문제의 강도를 확인합니다.",
        followUp: "시간, 비용, 감정 중 무엇이 가장 컸나요?"
      }
    ],
    currentAlternativeQuestions: [
      {
        question: "지금은 어떤 방법으로 해결하고 있나요?",
        intent: "현재 대안을 확인합니다.",
        followUp: "그 방법을 선택한 이유는 무엇인가요?"
      },
      {
        question: "현재 방법에서 가장 아쉬운 점은 무엇인가요?",
        intent: "기존 대안의 한계를 찾습니다.",
        followUp: "그 한계를 줄이려고 해본 일이 있나요?"
      }
    ],
    willingnessToPayQuestions: [
      {
        question: "이 문제가 더 잘 해결된다면 어떤 결과를 기대하나요?",
        intent: "고객이 느끼는 가치를 확인합니다.",
        followUp: "그 결과를 위해 시간이나 비용을 쓸 의사가 있나요?"
      },
      {
        question: "현재 해결을 위해 이미 돈이나 시간을 쓰고 있나요?",
        intent: "실제 지불 행동을 확인합니다.",
        followUp: "대략 어느 정도 쓰고 있나요?"
      }
    ],
    closingQuestions: [
      {
        question: "이 문제를 겪는 다른 사람을 소개해 주실 수 있나요?",
        intent: "추가 인터뷰 대상을 찾습니다.",
        followUp: "어떤 분이 비슷한 상황을 자주 겪나요?"
      },
      {
        question: "오늘 이야기 중 더 말하고 싶은 부분이 있나요?",
        intent: "빠진 맥락을 확인합니다.",
        followUp: "그 부분이 중요한 이유는 무엇인가요?"
      }
    ],
    avoidQuestions: ["저희 서비스가 있으면 쓰실래요?", "이 아이디어 괜찮아 보이나요?", "얼마면 구매하시겠어요?"],
    mentorComment: "인터뷰에서는 의견보다 최근 실제 행동을 물어보세요. 고객이 한 말보다 실제로 쓴 시간과 비용이 더 강한 증거입니다."
  };
}

export function buildCustomerSurveyPrompt(input: CustomerSurveyInput) {
  return [
    "너는 창업교육 현장에서 고객 검증용 설문지를 만드는 멘토다.",
    "참가자 입력과 이전 모듈 결과를 바탕으로 실제 응답을 수집할 수 있는 짧은 설문지를 설계하라.",
    "설문은 고객 문제의 빈도, 강도, 현재 대안, 비용/시간 지출, 지불의사를 검증해야 한다.",
    "문항은 유도하지 말고, 응답자가 쉽게 고를 수 있는 선택지와 5점 척도를 우선하라.",
    "전체 설문은 3~5분 안에 답할 수 있도록 구성하라.",
    "각 문항에는 type, question, purpose, options, required를 포함하라.",
    "type은 single_choice, multiple_choice, scale, short_answer 중 하나만 사용하라.",
    "scale 문항 options는 반드시 ['1 전혀 아니다','2 아니다','3 보통','4 그렇다','5 매우 그렇다'] 형식을 사용하라.",
    "short_answer 문항 options는 빈 배열로 둔다.",
    "입력이 부족하면 합리적으로 가정하되, 참가자 입력의 고객과 문제를 임의의 다른 사업으로 바꾸지 마라.",
    "반드시 JSON만 반환하라. 설명, 마크다운, 코드블록, 주석은 포함하지 마라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        surveyGoal: "설문으로 확인할 핵심 목표",
        targetRespondent: "응답 대상 조건",
        introMessage: "설문 시작 안내문",
        estimatedTime: "예상 소요 시간",
        screeningQuestions: [
          { type: "single_choice", question: "선별 문항", purpose: "문항 목적", options: ["예", "아니오"], required: true }
        ],
        problemValidationQuestions: [
          { type: "scale", question: "문제 검증 문항", purpose: "문항 목적", options: ["1 전혀 아니다", "2 아니다", "3 보통", "4 그렇다", "5 매우 그렇다"], required: true }
        ],
        currentAlternativeQuestions: [
          { type: "multiple_choice", question: "현재 대안 문항", purpose: "문항 목적", options: ["대안 1", "대안 2"], required: true }
        ],
        willingnessToPayQuestions: [
          { type: "single_choice", question: "지불의사 문항", purpose: "문항 목적", options: ["0원", "1천~3천원"], required: true }
        ],
        demographicQuestions: [
          { type: "single_choice", question: "응답자 특성 문항", purpose: "문항 목적", options: ["선택지 1", "선택지 2"], required: false }
        ],
        analysisGuide: ["분석 기준 1", "분석 기준 2", "분석 기준 3"],
        avoidNotes: ["주의점 1", "주의점 2", "주의점 3"],
        mentorComment: "멘토 코멘트"
      },
      null,
      2
    ),
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function normalizeSurveyQuestionType(value: unknown, fallback: CustomerSurveyQuestionType): CustomerSurveyQuestionType {
  const text = String(value || "").trim();
  if (text === "single_choice" || text === "multiple_choice" || text === "scale" || text === "short_answer") {
    return text;
  }
  return fallback;
}

function defaultScaleOptions() {
  return ["1 전혀 아니다", "2 아니다", "3 보통", "4 그렇다", "5 매우 그렇다"];
}

function normalizeSurveyQuestions(
  value: unknown,
  fallback: CustomerSurveyQuestion[],
  minItems: number,
  maxItems: number
): CustomerSurveyQuestion[] {
  const normalized = Array.isArray(value)
    ? value
        .map((item, index) => {
          const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          const fallbackItem = fallback[Math.min(index, fallback.length - 1)] || fallback[0];
          const type = normalizeSurveyQuestionType(source.type, fallbackItem.type);
          const options =
            type === "short_answer"
              ? []
              : type === "scale"
                ? defaultScaleOptions()
                : normalizeStringArray(source.options, fallbackItem.options.length ? fallbackItem.options : ["예", "아니오"], 8, 80);

          return {
            type,
            question: truncateByCharacters(normalizeText(source.question, fallbackItem.question), 180),
            purpose: truncateByCharacters(normalizeText(source.purpose, fallbackItem.purpose), 160),
            options,
            required: typeof source.required === "boolean" ? source.required : fallbackItem.required
          };
        })
        .filter((item) => item.question)
        .slice(0, maxItems)
    : [];

  return normalized.length >= minItems ? normalized : fallback;
}

export function parseCustomerSurveyJson(raw: string): CustomerSurveyDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof CustomerSurveyDraft, unknown>>;
  const draft: CustomerSurveyDraft = {
    surveyGoal: truncateByCharacters(normalizeText(parsed.surveyGoal, "고객 문제의 빈도와 현재 대안의 한계를 확인합니다."), 220),
    targetRespondent: truncateByCharacters(normalizeText(parsed.targetRespondent, "최근 2주 안에 해당 문제를 겪은 고객"), 180),
    introMessage: truncateByCharacters(
      normalizeText(parsed.introMessage, "이 설문은 창업교육 과정의 고객 문제 검증을 위한 3분 설문입니다. 최근 경험을 기준으로 답해주세요."),
      240
    ),
    estimatedTime: truncateByCharacters(normalizeText(parsed.estimatedTime, "3~5분"), 80),
    screeningQuestions: normalizeSurveyQuestions(
      parsed.screeningQuestions,
      [
        {
          type: "single_choice",
          question: "최근 2주 안에 이 문제를 직접 겪은 적이 있나요?",
          purpose: "응답 대상 적합성을 확인합니다.",
          options: ["예", "아니오"],
          required: true
        },
        {
          type: "single_choice",
          question: "이 문제를 본인이 직접 해결해야 했나요?",
          purpose: "실제 의사결정자인지 확인합니다.",
          options: ["예", "아니오", "가족/동료가 결정"],
          required: true
        }
      ],
      2,
      4
    ),
    problemValidationQuestions: normalizeSurveyQuestions(
      parsed.problemValidationQuestions,
      [
        {
          type: "scale",
          question: "이 문제는 최근 한 달 동안 반복해서 발생했습니다.",
          purpose: "문제 빈도를 확인합니다.",
          options: defaultScaleOptions(),
          required: true
        },
        {
          type: "scale",
          question: "이 문제가 생기면 시간이나 비용 부담이 큽니다.",
          purpose: "문제 강도를 확인합니다.",
          options: defaultScaleOptions(),
          required: true
        },
        {
          type: "short_answer",
          question: "가장 최근 이 문제를 겪은 상황을 한 문장으로 적어주세요.",
          purpose: "실제 사례를 수집합니다.",
          options: [],
          required: false
        }
      ],
      3,
      6
    ),
    currentAlternativeQuestions: normalizeSurveyQuestions(
      parsed.currentAlternativeQuestions,
      [
        {
          type: "multiple_choice",
          question: "현재 이 문제를 해결할 때 사용하는 방법을 모두 선택해주세요.",
          purpose: "현재 대안을 확인합니다.",
          options: ["직접 검색", "주변 추천", "기존 서비스", "참고 지나감", "기타"],
          required: true
        },
        {
          type: "scale",
          question: "현재 방법에 전반적으로 만족합니다.",
          purpose: "기존 대안 만족도를 확인합니다.",
          options: defaultScaleOptions(),
          required: true
        }
      ],
      2,
      5
    ),
    willingnessToPayQuestions: normalizeSurveyQuestions(
      parsed.willingnessToPayQuestions,
      [
        {
          type: "single_choice",
          question: "이 문제가 더 잘 해결된다면 비용을 지불할 의사가 있나요?",
          purpose: "지불의사를 확인합니다.",
          options: ["없음", "1천~3천원", "3천~5천원", "5천원 이상", "상황에 따라 다름"],
          required: true
        },
        {
          type: "single_choice",
          question: "현재 해결을 위해 한 번에 쓰는 비용은 어느 정도인가요?",
          purpose: "현재 지출 기준을 확인합니다.",
          options: ["0원", "1천원 미만", "1천~3천원", "3천~5천원", "5천원 이상"],
          required: false
        }
      ],
      2,
      4
    ),
    demographicQuestions: normalizeSurveyQuestions(
      parsed.demographicQuestions,
      [
        {
          type: "single_choice",
          question: "현재 본인에게 가장 가까운 상태를 선택해주세요.",
          purpose: "응답자 특성을 분류합니다.",
          options: ["학생", "직장인", "자영업자", "구직/준비 중", "기타"],
          required: false
        },
        {
          type: "short_answer",
          question: "응답자 특성을 이해하는 데 필요한 추가 정보를 적어주세요.",
          purpose: "세부 맥락을 보완합니다.",
          options: [],
          required: false
        }
      ],
      2,
      5
    ),
    analysisGuide: normalizeStringArray(
      parsed.analysisGuide,
      ["문제 빈도와 강도 4점 이상 비율을 확인합니다.", "현재 대안 만족도 3점 이하 응답자를 우선 인터뷰합니다.", "지불의사와 현재 지출이 함께 있는 응답자를 핵심 후보로 봅니다."],
      6,
      180
    ),
    avoidNotes: normalizeStringArray(
      parsed.avoidNotes,
      ["우리 서비스 설명을 먼저 보여주지 않습니다.", "좋다/나쁘다 의견보다 최근 행동을 묻습니다.", "너무 많은 주관식 문항을 넣지 않습니다."],
      6,
      180
    ),
    mentorComment: truncateByCharacters(
      normalizeText(parsed.mentorComment, "설문은 대량 신호를 찾는 도구입니다. 강한 응답자는 후속 인터뷰로 연결하세요."),
      220
    )
  };

  return customerSurveyDraftSchema.parse(draft);
}

export function createMockCustomerSurveyDraft(input: CustomerSurveyInput): CustomerSurveyDraft {
  const problem = input.problemStatementReport || input.interviewReport || input.ideaMemo || "고객이 반복해서 겪는 문제";
  const targetRespondent = problem.includes("자취") ? "최근 2주 안에 늦은 시간 식사를 고민한 자취생" : "최근 2주 안에 해당 문제를 직접 겪은 고객";
  return {
    surveyGoal: "고객 문제가 실제로 반복되는지, 현재 대안의 한계와 지불의사가 있는지 확인합니다.",
    targetRespondent,
    introMessage: "이 설문은 창업교육 과정의 고객 문제 검증을 위한 3분 설문입니다. 최근 경험을 기준으로 편하게 답해주세요.",
    estimatedTime: "3~5분",
    screeningQuestions: [
      {
        type: "single_choice",
        question: "최근 2주 안에 이 문제를 직접 겪은 적이 있나요?",
        purpose: "응답 대상 적합성을 확인합니다.",
        options: ["예", "아니오"],
        required: true
      },
      {
        type: "single_choice",
        question: "이 문제를 본인이 직접 해결해야 했나요?",
        purpose: "실제 의사결정자인지 확인합니다.",
        options: ["예", "아니오", "가족/동료가 결정"],
        required: true
      }
    ],
    problemValidationQuestions: [
      {
        type: "scale",
        question: "이 문제는 최근 한 달 동안 반복해서 발생했습니다.",
        purpose: "문제 빈도를 확인합니다.",
        options: defaultScaleOptions(),
        required: true
      },
      {
        type: "scale",
        question: "이 문제가 생기면 시간이나 비용 부담이 큽니다.",
        purpose: "문제 강도를 확인합니다.",
        options: defaultScaleOptions(),
        required: true
      },
      {
        type: "short_answer",
        question: "가장 최근 이 문제를 겪은 상황을 한 문장으로 적어주세요.",
        purpose: "실제 사례를 수집합니다.",
        options: [],
        required: false
      }
    ],
    currentAlternativeQuestions: [
      {
        type: "multiple_choice",
        question: "현재 이 문제를 해결할 때 사용하는 방법을 모두 선택해주세요.",
        purpose: "현재 대안을 확인합니다.",
        options: ["직접 검색", "주변 추천", "기존 서비스", "참고 지나감", "기타"],
        required: true
      },
      {
        type: "scale",
        question: "현재 방법에 전반적으로 만족합니다.",
        purpose: "기존 대안 만족도를 확인합니다.",
        options: defaultScaleOptions(),
        required: true
      }
    ],
    willingnessToPayQuestions: [
      {
        type: "single_choice",
        question: "이 문제가 더 잘 해결된다면 비용을 지불할 의사가 있나요?",
        purpose: "지불의사를 확인합니다.",
        options: ["없음", "1천~3천원", "3천~5천원", "5천원 이상", "상황에 따라 다름"],
        required: true
      },
      {
        type: "single_choice",
        question: "현재 해결을 위해 한 번에 쓰는 비용은 어느 정도인가요?",
        purpose: "현재 지출 기준을 확인합니다.",
        options: ["0원", "1천원 미만", "1천~3천원", "3천~5천원", "5천원 이상"],
        required: false
      }
    ],
    demographicQuestions: [
      {
        type: "single_choice",
        question: "현재 본인에게 가장 가까운 상태를 선택해주세요.",
        purpose: "응답자 특성을 분류합니다.",
        options: ["학생", "직장인", "자영업자", "구직/준비 중", "기타"],
        required: false
      },
      {
        type: "short_answer",
        question: "응답자 특성을 이해하는 데 필요한 추가 정보를 적어주세요.",
        purpose: "세부 맥락을 보완합니다.",
        options: [],
        required: false
      }
    ],
    analysisGuide: ["문제 빈도와 강도 4점 이상 비율을 확인합니다.", "현재 대안 만족도 3점 이하 응답자를 우선 인터뷰합니다.", "지불의사와 현재 지출이 함께 있는 응답자를 핵심 후보로 봅니다."],
    avoidNotes: ["우리 서비스 설명을 먼저 보여주지 않습니다.", "좋다/나쁘다 의견보다 최근 행동을 묻습니다.", "너무 많은 주관식 문항을 넣지 않습니다."],
    mentorComment: "설문은 대량 신호를 찾는 도구입니다. 강한 응답자는 후속 인터뷰로 연결하세요."
  };
}

const moduStartupKeys: Array<keyof ModuStartupDraft> = [
  "q1IdeaIntro",
  "q2BackgroundStory",
  "q3CustomerProblem",
  "q4ExecutionPlan",
  "q5CategoryReason",
  "q6BusinessStatusCheck",
  "q7TeamIntro",
  "q8VideoPitch",
  "openingHook",
  "evidenceLines",
  "personaDefinition",
  "differentiationFocus",
  "policyKeywords",
  "socialImpactEnding",
  "finalChecklist",
  "mentorComment"
];

export function buildModuStartupPrompt(input: ModuStartupInput) {
  return [
    "너는 한국 창업지원사업 신청서와 모두의창업 스타일 초안 작성에 능한 심사위원 관점 멘토다.",
    "참가자 입력을 바탕으로 바로 수정 가능한 신청서 초안을 작성하라.",
    "반드시 JSON만 반환하라. 코드블록, 설명, 마크다운, 주석을 절대 포함하지 마라.",
    "추상적 표현보다 1인칭 경험, 구체적 고객, 숫자 2개 이상, 짧은 증거 문장을 우선한다.",
    "첫 문장은 심사위원이 바로 궁금해할 문장으로 작성한다.",
    "페르소나는 한 명의 좁은 고객으로 정의한다.",
    "차별점은 여러 개를 나열하지 말고 가장 강한 1개에 집중한다.",
    "정책 키워드는 AI, 로컬, ESG, 글로벌, DX 중 아이템과 맞는 2~3개만 자연스럽게 고른다.",
    "마지막은 개인 성공담이 아니라 고객·지역·사회적 임팩트로 끝낸다.",
    "중복지원, 사업자 여부, 영상 제출, 24시간 묵히기 체크리스트를 반영한다.",
    "",
    "반환 JSON 키와 형식:",
    "- q1IdeaIntro: string, 100자 이내 한 줄 소개",
    "- q2BackgroundStory: string, 1인칭 경험 기반 배경 이야기 초안",
    "- q3CustomerProblem: string, 고객/문제/차별점 중심 초안",
    "- q4ExecutionPlan: string, 실행 가능 계획과 증거 중심 초안",
    "- q5CategoryReason: string, 선택 분야와 정책 키워드 연결 이유",
    "- q6BusinessStatusCheck: string, 현재 창업 여부와 중복지원 주의 문장",
    "- q7TeamIntro: string, 팀원 역할 소개 초안",
    "- q8VideoPitch: string, 60초 영상 제출용 구성안",
    "- openingHook: string, 첫 문장 후보",
    "- evidenceLines: string[], 3~5개, 한 줄 증거",
    "- personaDefinition: string, 좁은 고객 정의",
    "- differentiationFocus: string, 차별점 1개",
    "- policyKeywords: string[], 2~3개",
    "- socialImpactEnding: string, 사회적 임팩트 마무리 문장",
    "- finalChecklist: string[], 5~7개",
    "- mentorComment: string, 보완 조언",
    "",
    "참가자 입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export function parseModuStartupJson(raw: string): ModuStartupDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof ModuStartupDraft, unknown>>;

  const draft: ModuStartupDraft = {
    q1IdeaIntro: normalizeText(parsed.q1IdeaIntro),
    q2BackgroundStory: normalizeText(parsed.q2BackgroundStory),
    q3CustomerProblem: normalizeText(parsed.q3CustomerProblem),
    q4ExecutionPlan: normalizeText(parsed.q4ExecutionPlan),
    q5CategoryReason: normalizeText(parsed.q5CategoryReason),
    q6BusinessStatusCheck: normalizeText(parsed.q6BusinessStatusCheck),
    q7TeamIntro: normalizeText(parsed.q7TeamIntro),
    q8VideoPitch: normalizeText(parsed.q8VideoPitch),
    openingHook: normalizeText(parsed.openingHook),
    evidenceLines: normalizeBulletArray(parsed.evidenceLines).slice(0, 5),
    personaDefinition: normalizeText(parsed.personaDefinition),
    differentiationFocus: normalizeText(parsed.differentiationFocus),
    policyKeywords: normalizeBulletArray(parsed.policyKeywords).slice(0, 3),
    socialImpactEnding: normalizeText(parsed.socialImpactEnding),
    finalChecklist: normalizeBulletArray(parsed.finalChecklist).slice(0, 7),
    mentorComment: normalizeText(parsed.mentorComment)
  };

  for (const key of moduStartupKeys) {
    const value = draft[key];
    if (Array.isArray(value) && value.length === 0) {
      (draft[key] as string[]) = ["추가 작성 필요"];
    }
  }

  return moduStartupDraftSchema.parse(draft);
}

export function createMockModuStartupDraft(input: ModuStartupInput): ModuStartupDraft {
  const idea = input.ideaTitle || "창업 아이디어";
  const persona = input.customerProblem || "처음 창업지원사업을 준비하는 예비창업자";
  return {
    q1IdeaIntro: `${idea}는 ${persona}를 위해 반복 작성 시간을 줄이는 서비스입니다.`,
    q2BackgroundStory: "저는 신청서를 쓰며 막막했던 경험을 바탕으로, 초안 작성 시간을 줄이는 방법을 찾았습니다.",
    q3CustomerProblem: `${persona}는 자료는 있지만 문장으로 정리하지 못해 제출 직전까지 불안해합니다.`,
    q4ExecutionPlan: input.executionPlan || "1주 안에 인터뷰 10명, 베타 테스트 30명, 제출 전 만족도 조사를 진행합니다.",
    q5CategoryReason: `${input.category || "AI"} 분야와 연결해 반복 문서 작업을 자동화하는 방향으로 확장할 수 있습니다.`,
    q6BusinessStatusCheck: input.businessStatus || "현재 사업자 여부와 중복지원 가능성을 운영기관에 사전 확인합니다.",
    q7TeamIntro: input.teamMembers || "팀장은 고객 인터뷰, 팀원은 서비스 기획과 자료 정리를 담당합니다.",
    q8VideoPitch: input.videoUrl || "60초 영상은 문제, 고객, 해결책, 증거, 향후 계획 순서로 구성합니다.",
    openingHook: "지원사업 신청서를 쓰다 포기하는 예비창업자를 줄이고 싶습니다.",
    evidenceLines: ["베타 유저 30명 인터뷰 예정", "제출 전 체크리스트 12개 적용", "초안 작성 시간 50% 단축 목표"],
    personaDefinition: persona,
    differentiationFocus: "심사 기준에 맞춘 초안과 체크리스트를 한 화면에서 제공합니다.",
    policyKeywords: ["AI", "DX", "로컬"],
    socialImpactEnding: "더 많은 예비창업자가 첫 지원서 제출까지 완주하도록 돕겠습니다.",
    finalChecklist: ["첫 문장 확인", "숫자 2개 이상 포함", "중복지원 여부 확인", "영상 링크 확인", "24시간 뒤 재검토"],
    mentorComment: "본인 경험과 실제 수치를 추가하면 설득력이 더 커집니다."
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchChatCompletionContent(input: {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  timeoutMs: number;
}) {
  const { apiKey, baseUrl, model, fallbackModel } = getAiConfig();
  const endpoint = getChatCompletionsUrl(baseUrl);
  const modelCandidates = getModelCandidates(model, fallbackModel);
  let lastError: Error | undefined;

  for (const currentModel of modelCandidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: currentModel,
          temperature: input.temperature,
          response_format: { type: "json_object" },
          messages: input.messages
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        const message = `AI API 호출 실패: ${response.status} ${detail || response.statusText}`;

        if (response.status === 404 && currentModel === model && modelCandidates.length > 1) {
          lastError = new Error(message);
          continue;
        }

        throw new Error(message);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("AI 응답 본문이 비어 있습니다.");
      }

      return content;
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
      }
      lastError = error instanceof Error ? error : new Error("AI 호출 중 알 수 없는 오류가 발생했습니다.");
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("AI 호출에 실패했습니다.");
}

export async function generateLeanCanvas(input: ParticipantInput): Promise<LeanCanvasDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCanvas(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.3,
      timeoutMs: 45000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 린캔버스 작성 도우미다. 설명, 마크다운, 코드블록 없이 JSON만 반환한다."
        },
        {
          role: "user",
          content: buildLeanCanvasPrompt(input)
        }
      ]
    });

    return parseCanvasJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateOneLineIdeaDraft(input: OneLineIdeaInput): Promise<OneLineIdeaDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockOneLineIdeaDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.35,
      timeoutMs: 45000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 아이디어 문장화 도우미다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildOneLineIdeaPrompt(input)
        }
      ]
    });

    return parseOneLineIdeaJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateIdeaDiagnosisDraft(input: IdeaDiagnosisInput): Promise<IdeaDiagnosisDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockIdeaDiagnosisDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.25,
      timeoutMs: 50000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 아이디어 사전진단 멘토다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildIdeaDiagnosisPrompt(input)
        }
      ]
    });

    return parseIdeaDiagnosisJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateCustomerPersonaDraft(input: CustomerPersonaInput): Promise<CustomerPersonaDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCustomerPersonaDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.3,
      timeoutMs: 50000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 고객 페르소나 멘토다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildCustomerPersonaPrompt(input)
        }
      ]
    });

    return parseCustomerPersonaJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateCustomerJourneyDraft(input: CustomerJourneyInput): Promise<CustomerJourneyDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCustomerJourneyDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.3,
      timeoutMs: 50000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 고객 여정지도 멘토다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildCustomerJourneyPrompt(input)
        }
      ]
    });

    return parseCustomerJourneyJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateProblemStatementDraft(input: ProblemStatementInput): Promise<ProblemStatementDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockProblemStatementDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.25,
      timeoutMs: 50000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 문제정의문 멘토다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildProblemStatementPrompt(input)
        }
      ]
    });

    return parseProblemStatementJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateCustomerInterviewDraft(input: CustomerInterviewInput): Promise<CustomerInterviewDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCustomerInterviewDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.25,
      timeoutMs: 50000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 고객 인터뷰 질문지 멘토다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildCustomerInterviewPrompt(input)
        }
      ]
    });

    return parseCustomerInterviewJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateCustomerSurveyDraft(input: CustomerSurveyInput): Promise<CustomerSurveyDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCustomerSurveyDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.25,
      timeoutMs: 50000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업교육 고객 검증 설문지 멘토다. 설명, 마크다운, 코드블록 없이 JSON 객체만 반환한다."
        },
        {
          role: "user",
          content: buildCustomerSurveyPrompt(input)
        }
      ]
    });

    return parseCustomerSurveyJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}

export async function generateModuStartupDraft(input: ModuStartupInput): Promise<ModuStartupDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockModuStartupDraft(input);
  }

  try {
    const content = await fetchChatCompletionContent({
      temperature: 0.35,
      timeoutMs: 60000,
      messages: [
        {
          role: "system",
          content:
            "너는 JSON만 반환하는 창업지원사업 신청서 초안 작성 도우미다. 설명, 마크다운, 코드블록 없이 JSON만 반환한다."
        },
        {
          role: "user",
          content: buildModuStartupPrompt(input)
        }
      ]
    });

    return parseModuStartupJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  }
}
