import {
  emptyCanvasDraft,
  type LeanCanvasDraft,
  type ModuStartupDraft,
  type ModuStartupInput,
  type ParticipantInput
} from "@/lib/types";
import { z } from "zod";

const requiredKeys = Object.keys(emptyCanvasDraft) as Array<keyof LeanCanvasDraft>;
const DEFAULT_AI_MODEL = "gpt-5.4";
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

function normalizeText(value: unknown, fallback = "추가 작성 필요") {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join("\n") || fallback;
  if (typeof value === "string") return value.trim() || fallback;
  return fallback;
}

function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL_NAME || DEFAULT_AI_MODEL;

  if (!apiKey || !baseUrl) {
    throw new Error(".env.local에 AI_API_KEY, AI_BASE_URL을 설정하세요.");
  }

  return { apiKey, baseUrl, model };
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

export async function generateLeanCanvas(input: ParticipantInput): Promise<LeanCanvasDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCanvas(input);
  }

  const { apiKey, baseUrl, model } = getAiConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
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
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI API 호출 실패: ${response.status} ${detail}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI 응답 본문이 비어 있습니다.");
    }

    return parseCanvasJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateModuStartupDraft(input: ModuStartupInput): Promise<ModuStartupDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockModuStartupDraft(input);
  }

  const { apiKey, baseUrl, model } = getAiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
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
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI API 호출 실패: ${response.status} ${detail}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI 응답 본문이 비어 있습니다.");
    }

    return parseModuStartupJson(content);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
