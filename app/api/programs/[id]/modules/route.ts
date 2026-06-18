import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { getProgram, replaceProgramModules } from "@/lib/operationsRepository";
import { toProgramDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { STARTUP_MODULES, normalizeStartupModuleIds } from "@/lib/startupModules";

const moduleUpdateSchema = z.object({
  moduleIds: z.array(z.number().int().positive())
});

export async function PUT(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();
  try {
    const { id } = (await params) as { id: string };
    const program = await getProgram(id);
    if (!program) return NextResponse.json({ error: "프로그램을 찾을 수 없습니다." }, { status: 404 });
    const body = moduleUpdateSchema.parse(await request.json());
    const enabledModuleIds = normalizeStartupModuleIds(body.moduleIds);
    const modules = await replaceProgramModules(
      id,
      STARTUP_MODULES.map((module) => ({
        moduleId: module.id,
        moduleSlug: module.slug,
        isEnabled: enabledModuleIds.includes(module.id),
        sortOrder: module.order
      }))
    );
    return NextResponse.json({ program: toProgramDto(program, modules) });
  } catch (error) {
    return handleOperationsApiError(error, "프로그램 모듈 설정 저장 실패");
  }
}
