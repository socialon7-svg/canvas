import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OperationsRepositoryUnavailableError } from "@/lib/operationsRepository";

export function operationUnavailableResponse() {
  return NextResponse.json(
    { code: "SUPABASE_NOT_CONFIGURED", error: "Supabase 운영 저장소가 설정되지 않았습니다." },
    { status: 503 }
  );
}

export function operationTableNotReadyResponse() {
  return NextResponse.json(
    { code: "SUPABASE_TABLE_NOT_READY", error: "Supabase 운영 테이블이 아직 생성되지 않았습니다." },
    { status: 503 }
  );
}

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "요청값이 올바르지 않습니다.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    },
    { status: 400 }
  );
}

export function isOperationsTableMissingError(error: unknown) {
  const text = typeof error === "string" ? error : JSON.stringify(error) ?? "";
  return (
    text.includes("PGRST205") ||
    text.includes("42P01") ||
    text.includes("schema cache") ||
    text.includes("Could not find the table") ||
    (text.includes("relation") &&
      text.includes("does not exist") &&
      (text.includes("programs") ||
        text.includes("teams") ||
        text.includes("participants") ||
        text.includes("program_modules") ||
        text.includes("participant_module_progress") ||
        text.includes("module_drafts") ||
        text.includes("module_submissions") ||
        text.includes("feedbacks")))
  );
}

export function handleOperationsApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof OperationsRepositoryUnavailableError) {
    return operationUnavailableResponse();
  }

  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  if (isOperationsTableMissingError(error)) {
    return operationTableNotReadyResponse();
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
