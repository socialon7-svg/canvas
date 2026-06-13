import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";
import type { LeanCanvasDraft, LeanCanvasSubmission, ParticipantInput } from "@/lib/types";

interface SubmissionRequest {
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}

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

function validateSubmission(body: SubmissionRequest) {
  if (!body.participant?.educationName?.trim()) return "교육명이 없습니다.";
  if (!body.participant?.teamName?.trim()) return "팀명이 없습니다.";
  if (!body.participant?.participantName?.trim()) return "참가자명이 없습니다.";
  if (!body.participant?.ideaName?.trim()) return "아이디어명이 없습니다.";
  if (!body.canvas) return "린캔버스 데이터가 없습니다.";
  return "";
}

function isAuthorized(request: Request) {
  const adminPassword = request.headers.get("x-admin-password");
  return Boolean(process.env.ADMIN_PASSWORD && adminPassword === process.env.ADMIN_PASSWORD);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmissionRequest;
    const validationError = validateSubmission(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { code: "SUPABASE_NOT_CONFIGURED", error: "Supabase 중앙 저장소가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("lean_canvas_submissions")
      .insert({
        participant: body.participant,
        canvas: body.canvas
      })
      .select("id, created_at, participant, canvas")
      .single<SubmissionRow>();

    if (error) {
      throw error;
    }

    return NextResponse.json({ submission: toSubmission(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "제출 저장 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
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

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("lean_canvas_submissions")
      .select("id, created_at, participant, canvas")
      .order("created_at", { ascending: false })
      .returns<SubmissionRow[]>();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      submissions: data.map(toSubmission)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "제출 목록 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
