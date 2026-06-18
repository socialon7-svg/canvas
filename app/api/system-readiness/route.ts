import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";

const readinessChecks = [
  { key: "programs", label: "프로그램", table: "programs", columns: "id" },
  { key: "teams", label: "팀", table: "teams", columns: "id" },
  { key: "participants", label: "참여자·입장 토큰", table: "participants", columns: "id,join_token" },
  { key: "programModules", label: "프로그램 모듈", table: "program_modules", columns: "id" },
  { key: "moduleProgress", label: "모듈 진행상태", table: "participant_module_progress", columns: "id" },
  { key: "moduleDrafts", label: "서버 임시저장", table: "module_drafts", columns: "id" },
  {
    key: "moduleSubmissions",
    label: "공통 제출·PDF 상태",
    table: "module_submissions",
    columns: "id,pdf_status,pdf_generated_at"
  },
  { key: "feedbacks", label: "피드백", table: "feedbacks", columns: "id" },
  {
    key: "leanCanvasPdf",
    label: "린캔버스 PDF 상태",
    table: "lean_canvas_submissions",
    columns: "id,pdf_status,pdf_error_message,pdf_generated_at"
  }
] as const;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return adminUnauthorizedResponse();

  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({
      ready: false,
      mode: "demo",
      code: "SUPABASE_NOT_CONFIGURED",
      checks: readinessChecks.map((check) => ({ key: check.key, label: check.label, ready: false }))
    });
  }

  const supabase = createSupabaseServerClient();
  const checks = await Promise.all(
    readinessChecks.map(async (check) => {
      const { error } = await supabase.from(check.table).select(check.columns).limit(1);
      return {
        key: check.key,
        label: check.label,
        ready: !error,
        code: error?.code || undefined
      };
    })
  );

  return NextResponse.json({
    ready: checks.every((check) => check.ready),
    mode: checks.every((check) => check.ready) ? "server" : "demo",
    code: checks.every((check) => check.ready) ? undefined : "SUPABASE_SCHEMA_NOT_READY",
    checks
  });
}
