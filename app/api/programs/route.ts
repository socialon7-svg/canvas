import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createProgram, listProgramModules, listPrograms } from "@/lib/operationsRepository";
import { toProgramDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { normalizeAccessCode } from "@/lib/normalize";

const programCreateSchema = z.object({
  name: z.string().trim().min(1, "프로그램명을 입력해주세요."),
  clientName: z.string().trim().optional(),
  programCode: z.string().trim().optional(),
  startDate: z.string().trim().optional().nullable(),
  endDate: z.string().trim().optional().nullable(),
  status: z.string().trim().optional(),
  brief: z.string().trim().optional()
});

function makeProgramCode() {
  return `HV-${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PROGRAM"}`;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const programs = await listPrograms();
    const rows = await Promise.all(
      programs.map(async (program) => toProgramDto(program, await listProgramModules(program.id)))
    );

    return NextResponse.json({ programs: rows });
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

    return NextResponse.json({ program: toProgramDto(program) }, { status: 201 });
  } catch (error) {
    return handleOperationsApiError(error, "프로그램 생성 실패");
  }
}
