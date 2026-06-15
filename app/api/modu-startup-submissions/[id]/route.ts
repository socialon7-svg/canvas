import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";
import type { ModuStartupDraft, ModuStartupInput, ModuStartupSubmission } from "@/lib/types";

interface ModuStartupSubmissionRow {
  id: string;
  created_at: string;
  input: ModuStartupInput;
  draft: ModuStartupDraft;
}

function toSubmission(row: ModuStartupSubmissionRow): ModuStartupSubmission {
  return {
    id: row.id,
    createdAt: row.created_at,
    input: row.input,
    draft: row.draft,
    submissionStatus: "submitted",
    pdfStatus: "success"
  };
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return JSON.stringify(error) || fallback;
}

function missingTableResponse() {
  return NextResponse.json(
    { code: "SUPABASE_TABLE_NOT_READY", error: "Supabase 모두의창업 제출 테이블이 생성되지 않았습니다." },
    { status: 503 }
  );
}

export async function GET(_request: Request, { params }: { params: Promise<unknown> }) {
  try {
    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { code: "SUPABASE_NOT_CONFIGURED", error: "Supabase 중앙 저장소가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const { id } = (await params) as { id: string };
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("modu_startup_submissions")
      .select("id, created_at, input, draft")
      .eq("id", id)
      .single<ModuStartupSubmissionRow>();

    if (error || !data) {
      if (isMissingTableError(error)) {
        return missingTableResponse();
      }
      return NextResponse.json({ error: "모두의창업 제출물을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ submission: toSubmission(data) });
  } catch (error) {
    if (isMissingTableError(error)) {
      return missingTableResponse();
    }
    const message = getErrorMessage(error, "모두의창업 제출물 조회 실패");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
