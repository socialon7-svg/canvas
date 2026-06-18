import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import {
  createProgram,
  listFeedbacks,
  listModuleProgress,
  listModuleSubmissions,
  listParticipants,
  listProgramModules,
  listPrograms,
  listTeams,
  replaceProgramModules
} from "@/lib/operationsRepository";
import { toFeedbackDto, toParticipantDto, toProgramDto, toTeamDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { normalizeAccessCode } from "@/lib/normalize";
import { DEFAULT_STARTUP_MODULE_IDS, STARTUP_MODULES, normalizeStartupModuleIds } from "@/lib/startupModules";

const programCreateSchema = z.object({
  name: z.string().trim().min(1, "프로그램명을 입력해주세요."),
  clientName: z.string().trim().optional(),
  programCode: z.string().trim().optional(),
  startDate: z.string().trim().optional().nullable(),
  endDate: z.string().trim().optional().nullable(),
  status: z.string().trim().optional(),
  brief: z.string().trim().optional(),
  moduleIds: z.array(z.number().int().positive()).optional()
});

function makeProgramCode() {
  return `HV-${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PROGRAM"}`;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const includeOperations = new URL(request.url).searchParams.get("include") === "operations";
    const programs = await listPrograms();
    const bundles = await Promise.all(programs.map(async (program) => {
      const [modules, participants, teams, progress, feedbacks, submissions] = await Promise.all([
        listProgramModules(program.id),
        includeOperations ? listParticipants(program.id) : Promise.resolve([]),
        includeOperations ? listTeams(program.id) : Promise.resolve([]),
        includeOperations ? listModuleProgress(program.id) : Promise.resolve([]),
        includeOperations ? listFeedbacks(program.id) : Promise.resolve([]),
        includeOperations ? listModuleSubmissions({ programId: program.id }) : Promise.resolve([])
      ]);
      return { program: toProgramDto(program, modules), participants, teams, progress, feedbacks, submissions };
    }));
    const rows = bundles.map((bundle) => bundle.program);

    return NextResponse.json({
      mode: "server",
      programs: rows,
      ...(includeOperations
        ? {
            participants: bundles.flatMap((bundle) =>
              bundle.participants.map((participant) =>
                toParticipantDto(participant, bundle.progress, bundle.submissions)
              )
            ),
            teams: bundles.flatMap((bundle) => bundle.teams.map(toTeamDto)),
            feedbacks: bundles.flatMap((bundle) => bundle.feedbacks.map(toFeedbackDto))
          }
        : {})
    });
  } catch (error) {
    return handleOperationsApiError(error, "프로그램 목록 조회 실패");
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const body = programCreateSchema.parse(await request.json());
    const program = await createProgram({
      name: body.name,
      clientName: body.clientName,
      programCode: normalizeAccessCode(body.programCode || makeProgramCode()),
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      status: body.status || "active",
      brief: body.brief
    });
    const enabledModuleIds = normalizeStartupModuleIds(body.moduleIds || DEFAULT_STARTUP_MODULE_IDS);
    const modules = await replaceProgramModules(
      program.id,
      STARTUP_MODULES.map((module) => ({
        moduleId: module.id,
        moduleSlug: module.slug,
        isEnabled: enabledModuleIds.includes(module.id),
        sortOrder: module.order
      }))
    );

    return NextResponse.json({ program: toProgramDto(program, modules) }, { status: 201 });
  } catch (error) {
    return handleOperationsApiError(error, "프로그램 생성 실패");
  }
}
