import { NextResponse } from "next/server";
import { z } from "zod";
import { touchParticipantSeen } from "@/lib/operationsRepository";
import { toParticipantDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { authorizeActiveParticipantRequest } from "@/lib/participantAuth";

const lastSeenSchema = z.object({
  joined: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<unknown> }) {
  try {
    const { id } = (await params) as { id: string };
    if (!id?.trim()) {
      return NextResponse.json({ error: "참여자 ID가 없습니다." }, { status: 400 });
    }
    const authorization = await authorizeActiveParticipantRequest(request, { participantId: id });
    if (!authorization.ok) return authorization.response;

    const body = lastSeenSchema.parse(await request.json().catch(() => ({})));
    const participant = await touchParticipantSeen(id, Boolean(body.joined));

    return NextResponse.json({ participant: toParticipantDto(participant) });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 접속 상태 저장 실패");
  }
}
