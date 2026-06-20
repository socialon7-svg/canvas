import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAutomatedStartupModuleDraft } from "@/lib/ai";
import { getModuleRunnerDefinition, moduleRunnerInputSchema } from "@/lib/moduleRunner";
import { authorizeOperationRequest, authorizeParticipantRequest } from "@/lib/participantAuth";

export async function POST(request: Request) {
  try {
    const initialAuthorization = authorizeParticipantRequest(request, {}, { allowAdmin: true });
    if (!initialAuthorization.ok) return initialAuthorization.response;

    const input = moduleRunnerInputSchema.parse(await request.json());
    const runner = getModuleRunnerDefinition(input.moduleSlug);
    if (!runner) return NextResponse.json({ error: "지원하지 않는 자동화 모듈입니다." }, { status: 404 });

    const authorization = authorizeOperationRequest(request, input.operation);
    if (!authorization.ok) return authorization.response;
    if (runner.adminOnly && authorization.mode === "participant") {
      return NextResponse.json({ error: "이 모듈은 운영진 전용입니다." }, { status: 403 });
    }

    const draft = await generateAutomatedStartupModuleDraft(input);
    return NextResponse.json({ draft, rendererType: runner.rendererType });
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
