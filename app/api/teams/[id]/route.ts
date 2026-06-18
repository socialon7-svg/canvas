import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { deleteTeam, updateTeam } from "@/lib/operationsRepository";
import { toTeamDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

const teamUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  memo: z.string().trim().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    const body = teamUpdateSchema.parse(await request.json());
    return NextResponse.json({ team: toTeamDto(await updateTeam({ teamId: id, ...body })) });
  } catch (error) {
    return handleOperationsApiError(error, "팀 수정 실패");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    await deleteTeam(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleOperationsApiError(error, "팀 삭제 실패");
  }
}
