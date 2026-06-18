import { NextResponse } from "next/server";
import {
  getParticipant,
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
import { authorizeParticipantRequest } from "@/lib/participantAuth";
import { hasSupabaseServerConfig } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json(
      { code: "SUPABASE_NOT_CONFIGURED", error: "Supabase 중앙 저장소가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const authorization = authorizeParticipantRequest(request, {});
  if (!authorization.ok) return authorization.response;
  if (authorization.mode !== "participant") {
    return NextResponse.json({ error: "참여자 인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { programId, participantId } = authorization.session;
    const [program, participant] = await Promise.all([getProgram(programId), getParticipant(participantId)]);
    if (!program || !participant || participant.program_id !== program.id) {
      return NextResponse.json({ error: "참여자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const [modules, team, touchedParticipant, progress, submissions, feedbacks] = await Promise.all([
      listProgramModules(program.id),
      getTeam(participant.team_id),
      touchParticipantSeen(participant.id),
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
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return handleOperationsApiError(error, "참여자 최신 정보 조회 실패");
  }
}
