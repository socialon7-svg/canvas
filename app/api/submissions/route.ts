import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { mirrorLeanCanvasSubmission } from "@/lib/moduleSubmissionMirror";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";
import type { LeanCanvasDraft, LeanCanvasSubmission, ParticipantInput, PdfStatus } from "@/lib/types";

interface SubmissionRequest {
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
}

interface SubmissionRow {
  id: string;
  created_at: string;
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
  pdf_status?: string | null;
  pdf_error_message?: string | null;
  pdf_generated_at?: string | null;
}

function toSubmission(row: SubmissionRow): LeanCanvasSubmission {
  return {
    id: row.id,
    createdAt: row.created_at,
    participant: row.participant,
    canvas: row.canvas,
    submissionStatus: "submitted",
    pdfStatus: normalizePdfStatus(row.pdf_status),
    pdfErrorMessage: row.pdf_error_message ?? "",
    pdfGeneratedAt: row.pdf_generated_at ?? undefined
  };
}

function normalizePdfStatus(value: unknown): PdfStatus {
  return value === "generating" || value === "success" || value === "failed" || value === "idle" ? value : "idle";
}

function validateSubmission(body: SubmissionRequest) {
  if (!body.participant?.educationName?.trim()) return "교육명이 없습니다.";
  if (!body.participant?.teamName?.trim()) return "팀명이 없습니다.";
  if (!body.participant?.participantName?.trim()) return "참가자명이 없습니다.";
  if (!body.participant?.ideaName?.trim()) return "아이디어명이 없습니다.";
  if (!body.canvas) return "린캔버스 데이터가 없습니다.";
  return "";
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
      .select("*")
      .single<SubmissionRow>();

    if (error) {
      if (isMissingTableError(error)) {
        return missingTableResponse();
      }
      throw error;
    }

    if (!data) {
      return missingTableResponse();
    }

    const submission = toSubmission(data);
    const mirror = await mirrorLeanCanvasSubmission({
      submissionId: submission.id,
      participant: submission.participant,
      canvas: submission.canvas
    });

    return NextResponse.json({
      submission,
      moduleSubmissionId: mirror.ok ? mirror.moduleSubmission.id : undefined
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return missingTableResponse();
    }
    const message = getErrorMessage(error, "제출 저장 실패");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
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

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("lean_canvas_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SubmissionRow[]>();

    if (error) {
      if (isMissingTableError(error)) {
        return missingTableResponse();
      }
      throw error;
    }

    if (!data) {
      return missingTableResponse();
    }

    return NextResponse.json({
      submissions: data.map(toSubmission)
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return missingTableResponse();
    }
    const message = getErrorMessage(error, "제출 목록 조회 실패");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
