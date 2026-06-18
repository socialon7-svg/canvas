import { NextResponse } from "next/server";
import {
  getParticipantByJoinToken,
  getProgram,
  getTeam,
  listFeedbacks,
  listModuleProgress,
  listModuleSubmissions,
  listProgramModules,
  touchParticipantSeen
} from "@/lib/operationsRepository";
import { toFeedbackDto, toParticipantDto, toProgramDto, toTeamDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import {
  ParticipantAuthConfigurationError,
  setParticipantSessionCookie
} from "@/lib/participantAuth";

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

    const [modules, team, touchedParticipant, progress, submissions, feedbacks] = await Promise.all([
      listProgramModules(program.id),
      getTeam(participant.team_id),
      touchParticipantSeen(participant.id, true),
      listModuleProgress(program.id),
      listModuleSubmissions({ programId: program.id }),
      listFeedbacks(program.id)
    ]);

    const response = NextResponse.json({
      program: toProgramDto(program, modules),
      participant: toParticipantDto(touchedParticipant || participant, progress, submissions),
      team: team ? toTeamDto(team) : null,
      feedbacks: feedbacks.filter((feedback) => feedback.participant_id === participant.id).map(toFeedbackDto)
    });
    return setParticipantSessionCookie(response, { programId: program.id, participantId: participant.id });
  } catch (error) {
    if (error instanceof ParticipantAuthConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return handleOperationsApiError(error, "참여자 입장 링크 확인 실패");
  }
}
