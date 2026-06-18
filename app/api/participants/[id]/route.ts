import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { deleteParticipant, updateParticipant } from "@/lib/operationsRepository";
import { toParticipantDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { authorizeParticipantRequest } from "@/lib/participantAuth";

const participantUpdateSchema = z.object({
  teamId: z.string().trim().nullable().optional(),
  name: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  school: z.string().trim().optional(),
  major: z.string().trim().optional(),
  role: z.string().trim().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<unknown> }) {
  try {
    const { id } = (await params) as { id: string };
    const authorization = authorizeParticipantRequest(request, { participantId: id }, { allowAdmin: true });
    if (!authorization.ok) return authorization.response;
    const body = participantUpdateSchema.parse(await request.json());
    const participant = await updateParticipant({
      participantId: id,
      ...body,
      teamId: authorization.mode === "participant" ? undefined : body.teamId,
      role: authorization.mode === "participant" ? undefined : body.role
    });
    return NextResponse.json({ participant: toParticipantDto(participant) });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 수정 실패");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    await deleteParticipant(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 삭제 실패");
  }
}
