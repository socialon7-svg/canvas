import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { getProgram, listProgramModules, updateProgram } from "@/lib/operationsRepository";
import { toProgramDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";

const programUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  clientName: z.string().trim().optional(),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional(),
  status: z.enum(["active", "closed"]).optional(),
  brief: z.string().trim().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    if (!(await getProgram(id))) return NextResponse.json({ error: "프로그램을 찾을 수 없습니다." }, { status: 404 });
    const body = programUpdateSchema.parse(await request.json());
    const program = await updateProgram({ programId: id, ...body });
    return NextResponse.json({ program: toProgramDto(program, await listProgramModules(id)) });
  } catch (error) {
    return handleOperationsApiError(error, "프로그램 수정 실패");
  }
}
