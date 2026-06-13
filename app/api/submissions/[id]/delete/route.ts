import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";

function isAuthorized(request: Request) {
  const adminPassword = request.headers.get("x-admin-password");
  return Boolean(process.env.ADMIN_PASSWORD && adminPassword === process.env.ADMIN_PASSWORD);
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "PGRST205"
  );
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  try {
    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { code: "SUPABASE_NOT_CONFIGURED", error: "Supabase 중앙 저장소가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const { id } = (await params) as { id: string };
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("lean_canvas_submissions").delete().eq("id", id);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { code: "SUPABASE_TABLE_NOT_READY", error: "Supabase 테이블이 생성되지 않았습니다." },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "삭제 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
