import type {
  FeedbackStatus,
  HighViewFeedback,
  HighViewParticipant,
  HighViewProgram,
  HighViewTeam,
  ParticipantModuleProgressStatus
} from "@/lib/types";
import { DEFAULT_STARTUP_MODULE_IDS, getStartupModuleBySlug, normalizeStartupModuleIds } from "@/lib/startupModules";
import type {
  OperationsParticipantRow,
  FeedbackRow,
  ModuleSubmissionRow,
  ParticipantModuleProgressRow,
  OperationsProgramModuleRow,
  OperationsProgramRow,
  OperationsTeamRow
} from "@/lib/operationsRepository";

export function toProgramDto(program: OperationsProgramRow, modules: OperationsProgramModuleRow[] = []): HighViewProgram {
  return {
    id: program.id,
    name: program.name,
    clientName: program.client_name,
    startDate: program.start_date || "",
    endDate: program.end_date || "",
    programCode: program.program_code,
    status: program.status === "closed" ? "closed" : "active",
    createdAt: program.created_at,
    brief: program.brief,
    moduleIds: normalizeStartupModuleIds(
      modules.length ? modules.filter((module) => module.is_enabled).map((module) => module.module_id) : DEFAULT_STARTUP_MODULE_IDS
    )
  };
}

function jsonText(value: Record<string, unknown>) {
  return typeof value.text === "string" ? value.text : "";
}

function sourceSubmissionId(submission?: ModuleSubmissionRow) {
  const value = submission?.input_data.sourceSubmissionId;
  return typeof value === "string" ? value : submission?.id || "";
}

export function toParticipantDto(
  participant: OperationsParticipantRow,
  progressRows: ParticipantModuleProgressRow[] = [],
  submissionRows: ModuleSubmissionRow[] = []
): HighViewParticipant {
  const participantSubmissions = submissionRows.filter(
    (submission) => submission.participant_id === participant.id && submission.status !== "draft"
  );
  const latestLeanCanvas = participantSubmissions.find((submission) => submission.module_slug === "lean-canvas");
  const latestModuStartup = participantSubmissions.find(
    (submission) => submission.module_slug === "modu-startup-application"
  );
  const moduleProgress = Object.fromEntries(
    progressRows
      .filter((progress) => progress.participant_id === participant.id)
      .map((progress) => {
        const startupModule = getStartupModuleBySlug(progress.module_slug);
        return [
          progress.module_slug,
          {
            moduleId: startupModule?.id || 0,
            status: progress.status as ParticipantModuleProgressStatus,
            inputData: jsonText(progress.input_data),
            outputData: jsonText(progress.output_data),
            adminComment: progress.admin_comment,
            reviewedAt: progress.reviewed_at || undefined,
            createdAt: progress.updated_at,
            updatedAt: progress.updated_at
          }
        ];
      })
  );
  return {
    id: participant.id,
    programId: participant.program_id,
    code: participant.participant_code,
    joinToken: participant.join_token,
    joinTokenExpiresAt: participant.join_token_expires_at,
    joinTokenRevokedAt: participant.join_token_revoked_at || undefined,
    isActive: participant.is_active,
    name: participant.name,
    email: participant.email,
    phone: participant.phone,
    school: participant.school,
    major: participant.major,
    teamId: participant.team_id || "",
    role: participant.role,
    joinedAt: participant.joined_at || "",
    lastSeenAt: participant.last_seen_at || "",
    latestSubmissionId: sourceSubmissionId(latestLeanCanvas) || undefined,
    submittedAt: latestLeanCanvas?.submitted_at,
    latestModuStartupSubmissionId: sourceSubmissionId(latestModuStartup) || undefined,
    moduStartupSubmittedAt: latestModuStartup?.submitted_at,
    moduleProgress
  };
}

export function toTeamDto(team: OperationsTeamRow): HighViewTeam {
  return {
    id: team.id,
    programId: team.program_id,
    name: team.name,
    memo: team.memo,
    createdAt: team.created_at
  };
}

export function toFeedbackDto(feedback: FeedbackRow): HighViewFeedback {
  const status: FeedbackStatus =
    feedback.status === "good" || feedback.status === "excellent" ? feedback.status : "needs_revision";
  return {
    id: feedback.id,
    programId: feedback.program_id,
    participantId: feedback.participant_id,
    submissionId: feedback.submission_id || "",
    comment: feedback.comment,
    nextAction: feedback.next_action,
    status,
    createdAt: feedback.created_at,
    updatedAt: feedback.updated_at
  };
}
