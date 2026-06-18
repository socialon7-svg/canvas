import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getParticipantByCode,
  getProgramByCode,
  getTeam,
  listFeedbacks,
  listModuleProgress,
  listModuleSubmissions,
  listProgramModules,
  touchParticipantSeen
} from "@/lib/operationsRepository";
import { toFeedbackDto, toParticipantDto, toProgramDto, toTeamDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { normalizeAccessCode } from "@/lib/normalize";
import {
  ParticipantAuthConfigurationError,
  setParticipantSessionCookie
} from "@/lib/participantAuth";

const participantJoinSchema = z.object({
  programCode: z.string().trim().min(1, "프로그램 코드를 입력해주세요."),
  participantCode: z.string().trim().min(1, "참여자 코드를 입력해주세요.")
});

export async function POST(request: Request) {
  try {
    const body = participantJoinSchema.parse(await request.json());
    const programCode = normalizeAccessCode(body.programCode);
    const participantCode = normalizeAccessCode(body.participantCode);

    const program = await getProgramByCode(programCode);
    if (!program) {
      return NextResponse.json({ error: "입장 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const participant = await getParticipantByCode(program.id, participantCode);
    if (!participant) {
      return NextResponse.json({ error: "입장 정보를 찾을 수 없습니다." }, { status: 404 });
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
    return handleOperationsApiError(error, "참여자 입장 실패");
  }
}
