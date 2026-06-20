import { NextResponse } from "next/server";
import { z } from "zod";
import { toLeanCanvasSubmission } from "@/lib/moduleSubmissionAdapters";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import {
  getModuleSubmission,
  updateModuleSubmissionPdfStatus
} from "@/lib/operationsRepository";
import { authorizeParticipantRequest } from "@/lib/participantAuth";

const pdfStatusSchema = z.object({
  pdfStatus: z.enum(["idle", "generating", "success", "failed"]),
  pdfErrorMessage: z.string().max(1000).optional()
});

async function findLeanCanvasSubmission(id: string) {
  const row = await getModuleSubmission(id);
  return row?.module_slug === "lean-canvas" ? row : null;
}

export async function GET(request: Request, { params }: { params: Promise<unknown> }) {
  try {
    const { id } = (await params) as { id: string };
    const row = await findLeanCanvasSubmission(id);
    if (!row) return NextResponse.json({ error: "제출물을 찾을 수 없습니다." }, { status: 404 });
    const authorization = authorizeParticipantRequest(
      request,
      { programId: row.program_id, participantId: row.participant_id },
      { allowAdmin: true }
    );
    if (!authorization.ok) return authorization.response;
    return NextResponse.json({ submission: toLeanCanvasSubmission(row) });
  } catch (error) {
    return handleOperationsApiError(error, "린캔버스 제출물 조회 실패");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<unknown> }) {
  try {
    const { id } = (await params) as { id: string };
    const existing = await findLeanCanvasSubmission(id);
    if (!existing) return NextResponse.json({ error: "제출물을 찾을 수 없습니다." }, { status: 404 });

    const authorization = authorizeParticipantRequest(
      request,
      { programId: existing.program_id, participantId: existing.participant_id },
      { allowAdmin: true }
    );
    if (!authorization.ok) return authorization.response;

    const body = pdfStatusSchema.parse(await request.json());
    const row = await updateModuleSubmissionPdfStatus({
      submissionId: id,
      pdfStatus: body.pdfStatus,
      pdfErrorMessage: body.pdfErrorMessage
    });
    return NextResponse.json({ submission: toLeanCanvasSubmission(row) });
  } catch (error) {
    return handleOperationsApiError(error, "린캔버스 PDF 상태 저장 실패");
  }
}
