import type {
  HighViewParticipant,
  HighViewProgram,
  HighViewTeam
} from "@/lib/types";
import { DEFAULT_STARTUP_MODULE_IDS, normalizeStartupModuleIds } from "@/lib/startupModules";
import type {
  OperationsParticipantRow,
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

export function toParticipantDto(participant: OperationsParticipantRow): HighViewParticipant {
  return {
    id: participant.id,
    programId: participant.program_id,
    code: participant.participant_code,
    joinToken: participant.join_token,
    name: participant.name,
    email: participant.email,
    phone: participant.phone,
    school: participant.school,
    major: participant.major,
    teamId: participant.team_id || "",
    role: participant.role,
    joinedAt: participant.joined_at || "",
    lastSeenAt: participant.last_seen_at || "",
    moduleProgress: {}
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
