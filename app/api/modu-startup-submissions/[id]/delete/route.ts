import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { deleteModuleSubmission, getModuleSubmission } from "@/lib/operationsRepository";

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();

  try {
    const { id } = (await params) as { id: string };
    const row = await getModuleSubmission(id);
    if (!row || row.module_slug !== "modu-startup-application") {
      return NextResponse.json({ error: "제출물을 찾을 수 없습니다." }, { status: 404 });
    }
    await deleteModuleSubmission(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleOperationsApiError(error, "모두의창업 제출물 삭제 실패");
  }
}
