import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createTeam, getProgram, listTeams } from "@/lib/operationsRepository";
import { toTeamDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

const teamCreateSchema = z.object({
  name: z.string().trim().min(1, "팀명을 입력해주세요."),
  memo: z.string().trim().optional()
});

export async function GET(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    return NextResponse.json({ teams: (await listTeams(id)).map(toTeamDto) });
  } catch (error) {
    return handleOperationsApiError(error, "팀 목록 조회 실패");
  }
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    if (!(await getProgram(id))) return NextResponse.json({ error: "프로그램을 찾을 수 없습니다." }, { status: 404 });
    const body = teamCreateSchema.parse(await request.json());
    return NextResponse.json({ team: toTeamDto(await createTeam({ programId: id, ...body })) }, { status: 201 });
  } catch (error) {
    return handleOperationsApiError(error, "팀 생성 실패");
  }
}
