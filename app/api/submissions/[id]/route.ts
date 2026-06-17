import { NextResponse } from "next/server";
import { z } from "zod";
import { mirrorPdfStatusToModuleSubmission } from "@/lib/moduleSubmissionMirror";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";
import type { LeanCanvasDraft, LeanCanvasSubmission, ParticipantInput, PdfStatus } from "@/lib/types";

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

const pdfStatusSchema = z.object({
  pdfStatus: z.enum(["idle", "generating", "success", "failed"]),
  pdfErrorMessage: z.string().max(1000).optional()
});

function normalizePdfStatus(value: unknown): PdfStatus {
  return value === "generating" || value === "success" || value === "failed" || value === "idle" ? value : "idle";
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
      .select("*")
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

export async function PATCH(request: Request, { params }: { params: Promise<unknown> }) {
  try {
    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { code: "SUPABASE_NOT_CONFIGURED", error: "Supabase 중앙 저장소가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const { id } = (await params) as { id: string };
    const body = pdfStatusSchema.parse(await request.json());
    const patch = {
      pdf_status: body.pdfStatus,
      pdf_error_message: body.pdfStatus === "failed" ? (body.pdfErrorMessage ?? "") : null,
      pdf_generated_at: body.pdfStatus === "success" ? new Date().toISOString() : null
    };
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("lean_canvas_submissions")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single<SubmissionRow>();

    if (error || !data) {
      if (isMissingTableError(error)) {
        return missingTableResponse();
      }
      return NextResponse.json({ error: "PDF 상태를 저장하지 못했습니다." }, { status: 404 });
    }

    await mirrorPdfStatusToModuleSubmission({
      source: "lean_canvas_submissions",
      sourceSubmissionId: id,
      pdfStatus: body.pdfStatus,
      pdfErrorMessage: body.pdfErrorMessage
    });

    return NextResponse.json({ submission: toSubmission(data) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "PDF 상태 요청값이 올바르지 않습니다.", issues: error.issues }, { status: 400 });
    }
    if (isMissingTableError(error)) {
      return missingTableResponse();
    }
    const message = getErrorMessage(error, "PDF 상태 저장 실패");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
