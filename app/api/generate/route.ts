import { NextResponse } from "next/server";
import { z } from "zod";
import { generateLeanCanvas } from "@/lib/ai";
import { authorizeActiveOperationRequest } from "@/lib/participantAuth";
import type { ParticipantInput } from "@/lib/types";

const textField = (max = 2000) => z.string().trim().max(max).optional().default("");

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

const participantInputSchema = z.object({
  educationName: textField(300),
  teamName: textField(200),
  participantName: textField(100),
  ideaName: textField(300),
  ideaSummary: textField(1000),
  targetCustomer: textField(),
  problemToSolve: textField(),
  existingAlternative: textField(),
  ourSolution: textField(),
  revenueModel: textField(),
  differentiation: textField(),
  operation: operationContextSchema
});

export async function POST(request: Request) {
  let input: ParticipantInput;

  try {
    input = participantInputSchema.parse(await request.json()) as ParticipantInput;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "요청 본문을 읽지 못했습니다." }, { status: 400 });
  }

  try {
    const authorization = await authorizeActiveOperationRequest(request, input.operation);
    if (!authorization.ok) return authorization.response;
    const canvas = await generateLeanCanvas(input);
    return NextResponse.json({ canvas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
