import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { toModuStartupSubmission } from "@/lib/moduleSubmissionAdapters";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import {
  createModuleSubmission,
  listModuleSubmissions,
  upsertModuleProgress
} from "@/lib/operationsRepository";
import { authorizeParticipantRequest } from "@/lib/participantAuth";
import type { ModuStartupDraft, ModuStartupInput } from "@/lib/types";

interface ModuStartupSubmissionRequest {
  input: ModuStartupInput;
  draft: ModuStartupDraft;
}

const listQuerySchema = z.object({
  programId: z.string().trim().max(200).optional()
});

function validateSubmission(body: ModuStartupSubmissionRequest) {
  if (!body.input?.programName?.trim()) return "교육명이 없습니다.";
  if (!body.input?.participantName?.trim()) return "참여자명이 없습니다.";
  if (!body.input?.ideaTitle?.trim() && !body.input?.ideaOneLine?.trim()) return "아이디어 정보가 없습니다.";
  if (!body.draft) return "모두의창업 초안 데이터가 없습니다.";
  if (!body.input.operation?.programId || !body.input.operation.participantId) {
    return "참여자 운영 정보가 없어 제출할 수 없습니다. 참여자 포털에서 다시 입장해 주세요.";
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const initialAuthorization = authorizeParticipantRequest(request, {}, { allowAdmin: true });
    if (!initialAuthorization.ok) return initialAuthorization.response;

    const body = (await request.json()) as ModuStartupSubmissionRequest;
    const validationError = validateSubmission(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const operation = body.input.operation!;
    const authorization = authorizeParticipantRequest(
      request,
      { programId: operation.programId, participantId: operation.participantId },
      { allowAdmin: true }
    );
    if (!authorization.ok) return authorization.response;

    const row = await createModuleSubmission({
      programId: operation.programId!,
      participantId: operation.participantId!,
      teamId: operation.teamId || null,
      moduleSlug: "modu-startup-application",
      title: body.input.ideaTitle || body.input.ideaOneLine || "모두의창업 제출",
      status: "submitted",
      pdfStatus: "idle",
      inputData: { input: body.input },
      outputData: { draft: body.draft }
    });

    await upsertModuleProgress({
      programId: operation.programId!,
      participantId: operation.participantId!,
      moduleSlug: "modu-startup-application",
      status: "completed",
      currentStep: 100,
      inputData: { sourceSubmissionId: row.id },
      outputData: { title: row.title }
    });

    return NextResponse.json({ submission: toModuStartupSubmission(row), moduleSubmissionId: row.id });
  } catch (error) {
    return handleOperationsApiError(error, "모두의창업 제출 저장 실패");
  }
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();

  try {
    const url = new URL(request.url);
    const query = listQuerySchema.parse({ programId: url.searchParams.get("programId") || undefined });
    const rows = await listModuleSubmissions({
      programId: query.programId,
      moduleSlug: "modu-startup-application"
    });
    return NextResponse.json({
      submissions: rows.filter((row) => row.status !== "draft").map(toModuStartupSubmission)
    });
  } catch (error) {
    return handleOperationsApiError(error, "모두의창업 제출 목록 조회 실패");
  }
}
