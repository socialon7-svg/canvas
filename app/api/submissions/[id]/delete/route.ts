import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";

function isMissingTableError(error: unknown) {
  const text = typeof error === "string" ? error : JSON.stringify(error) ?? "";
  return (
    text.includes("PGRST205") ||
    text.includes("42P01") ||
    text.includes("schema cache") ||
    text.includes("Could not find the table") ||
    text.includes("lean_canvas_submissions")
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return JSON.stringify(error) || fallback;
}

function missingTableResponse() {
  return NextResponse.json(
    { code: "SUPABASE_TABLE_NOT_READY", error: "Supabase 테이블이 생성되지 않았습니다." },
    { status: 503 }
  );
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
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
        return missingTableResponse();
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingTableError(error)) {
      return missingTableResponse();
    }
    const message = getErrorMessage(error, "삭제 실패");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
