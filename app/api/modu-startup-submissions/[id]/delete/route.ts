import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";

function isAuthorized(request: Request) {
  const adminPassword = request.headers.get("x-admin-password");
  return Boolean(process.env.ADMIN_PASSWORD && adminPassword === process.env.ADMIN_PASSWORD);
}

function isMissingTableError(error: unknown) {
  const text = typeof error === "string" ? error : JSON.stringify(error) ?? "";
  return (
    text.includes("PGRST205") ||
    text.includes("42P01") ||
    text.includes("schema cache") ||
    text.includes("Could not find the table") ||
    text.includes("modu_startup_submissions")
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
    const { error } = await supabase.from("modu_startup_submissions").delete().eq("id", id);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { code: "SUPABASE_TABLE_NOT_READY", error: "Supabase 모두의창업 제출 테이블이 생성되지 않았습니다." },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { code: "SUPABASE_TABLE_NOT_READY", error: "Supabase 모두의창업 제출 테이블이 생성되지 않았습니다." },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : "모두의창업 제출물 삭제 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
