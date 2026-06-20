import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import {
  reissueParticipantJoinToken,
  revokeParticipantJoinToken
} from "@/lib/operationsRepository";
import { toParticipantDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

const reissueSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(180)
});

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();

  try {
    const { id } = (await params) as { id: string };
    const body = reissueSchema.parse(await request.json().catch(() => ({})));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
    const participant = await reissueParticipantJoinToken({
      participantId: id,
      expiresAt: expiresAt.toISOString()
    });
    return NextResponse.json({ participant: toParticipantDto(participant) });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 입장 링크 재발급 실패");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();

  try {
    const { id } = (await params) as { id: string };
    const participant = await revokeParticipantJoinToken(id);
    return NextResponse.json({ participant: toParticipantDto(participant) });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 입장 링크 회수 실패");
  }
}
