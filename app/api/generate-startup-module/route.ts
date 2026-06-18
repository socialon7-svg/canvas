import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAutomatedStartupModuleDraft } from "@/lib/ai";
import { authorizeOperationRequest, authorizeParticipantRequest } from "@/lib/participantAuth";
import { getStartupModuleAutomationConfig } from "@/lib/startupModuleAutomation";

const textField = (max = 5000) => z.string().trim().max(max).optional().default("");
const operationSchema = z
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
  .optional();
const inputSchema = z.object({
  moduleSlug: z.string().trim().min(1).max(100),
  programName: textField(300),
  teamName: textField(200),
  participantName: textField(100),
  ideaMemo: z.string().trim().min(1, "모듈 메모를 입력해주세요.").max(6000),
  previousResults: textField(12000),
  operation: operationSchema
});

export async function POST(request: Request) {
  try {
    const initialAuthorization = authorizeParticipantRequest(request, {}, { allowAdmin: true });
    if (!initialAuthorization.ok) return initialAuthorization.response;

    const input = inputSchema.parse(await request.json());
    const config = getStartupModuleAutomationConfig(input.moduleSlug);
    if (!config) return NextResponse.json({ error: "지원하지 않는 자동화 모듈입니다." }, { status: 404 });

    const authorization = authorizeOperationRequest(request, input.operation);
    if (!authorization.ok) return authorization.response;
    if (config.adminOnly && authorization.mode === "participant") {
      return NextResponse.json({ error: "이 모듈은 운영진 전용입니다." }, { status: 403 });
    }

    const draft = await generateAutomatedStartupModuleDraft(input);
    return NextResponse.json({ draft });
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
