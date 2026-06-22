import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { toLeanCanvasSubmission } from "@/lib/moduleSubmissionAdapters";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import {
  createModuleSubmission,
  listModuleSubmissions,
  upsertModuleProgress
} from "@/lib/operationsRepository";
import { authorizeActiveParticipantRequest, authorizeParticipantRequest } from "@/lib/participantAuth";
import type { LeanCanvasDraft, ParticipantInput } from "@/lib/types";

interface SubmissionRequest {
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}

function validateSubmission(body: SubmissionRequest) {
  if (!body.participant?.educationName?.trim()) return "교육명이 없습니다.";
  if (!body.participant?.teamName?.trim()) return "팀명이 없습니다.";
  if (!body.participant?.participantName?.trim()) return "참여자명이 없습니다.";
  if (!body.participant?.ideaName?.trim()) return "아이디어명이 없습니다.";
  if (!body.canvas) return "린캔버스 데이터가 없습니다.";
  if (!body.participant.operation?.programId || !body.participant.operation.participantId) {
    return "참여자 운영 정보가 없어 제출할 수 없습니다. 참여자 포털에서 다시 입장해 주세요.";
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const initialAuthorization = authorizeParticipantRequest(request, {}, { allowAdmin: true });
    if (!initialAuthorization.ok) return initialAuthorization.response;

    const body = (await request.json()) as SubmissionRequest;
    const validationError = validateSubmission(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const operation = body.participant.operation!;
    const authorization = await authorizeActiveParticipantRequest(
      request,
      { programId: operation.programId, participantId: operation.participantId },
      { allowAdmin: true }
    );
    if (!authorization.ok) return authorization.response;

    const row = await createModuleSubmission({
      programId: operation.programId!,
      participantId: operation.participantId!,
      teamId: operation.teamId || null,
      moduleSlug: "lean-canvas",
      title: body.participant.ideaName || body.participant.ideaSummary || "린캔버스 제출",
      status: "submitted",
      pdfStatus: "idle",
      inputData: { participant: body.participant },
      outputData: { canvas: body.canvas }
    });

    await upsertModuleProgress({
      programId: operation.programId!,
      participantId: operation.participantId!,
      moduleSlug: "lean-canvas",
      status: "completed",
      currentStep: 100,
      inputData: { sourceSubmissionId: row.id },
      outputData: { title: row.title }
    });

    return NextResponse.json({ submission: toLeanCanvasSubmission(row), moduleSubmissionId: row.id });
  } catch (error) {
    return handleOperationsApiError(error, "린캔버스 제출 저장 실패");
  }
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();

  try {
    const rows = await listModuleSubmissions({ moduleSlug: "lean-canvas" });
    return NextResponse.json({
      submissions: rows.filter((row) => row.status !== "draft").map(toLeanCanvasSubmission)
    });
  } catch (error) {
    return handleOperationsApiError(error, "린캔버스 제출 목록 조회 실패");
  }
}
