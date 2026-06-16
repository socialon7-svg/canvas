import { NextResponse } from "next/server";
import {
  getParticipantByJoinToken,
  getProgram,
  getTeam,
  listProgramModules,
  touchParticipantSeen
} from "@/lib/operationsRepository";
import { toParticipantDto, toProgramDto, toTeamDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

export async function GET(_request: Request, { params }: { params: Promise<unknown> }) {
  try {
    const { token } = (await params) as { token: string };
    if (!token?.trim()) {
      return NextResponse.json({ error: "입장 토큰이 없습니다." }, { status: 400 });
    }

    const participant = await getParticipantByJoinToken(token);
    if (!participant) {
      return NextResponse.json({ error: "입장 링크를 찾을 수 없습니다." }, { status: 404 });
    }

    const program = await getProgram(participant.program_id);
    if (!program) {
      return NextResponse.json({ error: "연결된 프로그램을 찾을 수 없습니다." }, { status: 404 });
    }

    const [modules, team, touchedParticipant] = await Promise.all([
      listProgramModules(program.id),
      getTeam(participant.team_id),
      touchParticipantSeen(participant.id, true)
    ]);

    return NextResponse.json({
      program: toProgramDto(program, modules),
      participant: toParticipantDto(touchedParticipant || participant),
      team: team ? toTeamDto(team) : null
    });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 입장 링크 확인 실패");
  }
}
