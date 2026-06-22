import { NextResponse } from "next/server";
import { z } from "zod";
import { generateValidationExperimentDraft } from "@/lib/ai";
import { authorizeActiveOperationRequest } from "@/lib/participantAuth";
import type { ValidationExperimentInput } from "@/lib/types";

const textField = (max = 3000) => z.string().trim().max(max).optional().default("");

const operationContextSchema = z
  .object({
    programId: textField(200),
    programCode: textField(100),
    programName: textField(300),
    participantId: textField(200),
    participantCode: textField(100),
    teamId: textField(200),
    teamName: textField(300),
    role: textField(100)
  })
  .partial()
  .optional();

const validationExperimentInputSchema = z.object({
  programName: textField(300),
  teamName: textField(200),
  participantName: textField(100),
  ideaMemo: z.string().trim().min(1, "검증 실험을 만들 고객 문제 메모를 입력해주세요.").max(3000),
  oneLineIdea: textField(1200),
  diagnosisReport: textField(3000),
  personaReport: textField(3000),
  journeyReport: textField(3000),
  problemStatementReport: textField(3000),
  interviewReport: textField(3000),
  surveyReport: textField(3000),
  operation: operationContextSchema
});

export async function POST(request: Request) {
  let input: ValidationExperimentInput;

  try {
    input = validationExperimentInputSchema.parse(await request.json()) as ValidationExperimentInput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "요청 본문을 읽지 못했습니다." }, { status: 400 });
  }

  try {
    const authorization = await authorizeActiveOperationRequest(request, input.operation);
    if (!authorization.ok) return authorization.response;
    const draft = await generateValidationExperimentDraft(input);
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
