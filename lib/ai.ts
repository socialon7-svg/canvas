import { emptyCanvasDraft, type LeanCanvasDraft, type ParticipantInput } from "@/lib/types";

const requiredKeys = Object.keys(emptyCanvasDraft) as Array<keyof LeanCanvasDraft>;

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
      .slice(0, 3);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|•|- /)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^[-•]\s*/, ""))
      .slice(0, 3);
  }

  return [];
}

export function parseCanvasJson(raw: string): LeanCanvasDraft {
  const jsonText = extractJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<Record<keyof LeanCanvasDraft, unknown>>;
  const result: LeanCanvasDraft = { ...emptyCanvasDraft };

  for (const key of requiredKeys) {
    const items = normalizeBulletArray(parsed[key]);
    result[key] = items.length > 0 ? items : ["추가 작성 필요"];
  }

  return result;
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

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function generateLeanCanvas(input: ParticipantInput): Promise<LeanCanvasDraft> {
  if (process.env.AI_MOCK === "true") {
    return createMockCanvas(input);
  }

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL_NAME;

  if (!apiKey || !baseUrl || !model) {
    throw new Error(".env.local에 AI_API_KEY, AI_BASE_URL, AI_MODEL_NAME을 설정하세요.");
  }

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
