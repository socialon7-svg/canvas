import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";
import type { LeanCanvasDraft, LeanCanvasSubmission, ParticipantInput } from "@/lib/types";

interface SubmissionRow {
  id: string;
  created_at: string;
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}

function toSubmission(row: SubmissionRow): LeanCanvasSubmission {
  return {
    id: row.id,
    createdAt: row.created_at,
    participant: row.participant,
    canvas: row.canvas
  };
}

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
      .from("lean_canvas_submissions")
      .select("id, created_at, participant, canvas")
      .eq("id", id)
      .single<SubmissionRow>();

    if (error || !data) {
      if (isMissingTableError(error)) {
        return missingTableResponse();
      }
      return NextResponse.json({ error: "제출물을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ submission: toSubmission(data) });
  } catch (error) {
    if (isMissingTableError(error)) {
      return missingTableResponse();
    }
    const message = getErrorMessage(error, "제출물 조회 실패");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
