import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBusinessModelDraft } from "@/lib/ai";
import { authorizeOperationRequest } from "@/lib/participantAuth";
import type { BusinessModelInput } from "@/lib/types";

const textField = (max = 5000) => z.string().trim().max(max).optional().default("");
const operationContextSchema = z.object({
  programId: textField(200),
  programCode: textField(100),
  programName: textField(300),
  participantId: textField(200),
  participantCode: textField(100),
  teamId: textField(200),
  teamName: textField(300),
  role: textField(100)
}).partial().optional();
const inputSchema = z.object({
  programName: textField(300),
  teamName: textField(200),
  participantName: textField(100),
  ideaMemo: z.string().trim().min(1, "사업모델 메모를 입력해주세요.").max(3000),
  oneLineIdea: textField(1200),
  diagnosisReport: textField(3000),
  personaReport: textField(3000),
  problemStatementReport: textField(3000),
  validationExperimentReport: textField(3000),
  marketResearchReport: textField(),
  competitorAnalysisReport: textField(),
  differentiationStrategyReport: textField(),
  operation: operationContextSchema
});

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json()) as BusinessModelInput;
    const authorization = authorizeOperationRequest(request, input.operation);
    if (!authorization.ok) return authorization.response;
    return NextResponse.json({ draft: await generateBusinessModelDraft(input) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
