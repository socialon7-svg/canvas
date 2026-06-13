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
      return NextResponse.json({ error: "제출물을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ submission: toSubmission(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "제출물 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
