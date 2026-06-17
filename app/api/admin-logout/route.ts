import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminCookieOptions } from "@/lib/adminAuth";

function isFormRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

function safeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//")) return "/admin";
  return path;
}

function redirectUrl(request: Request, path: string) {
  return new URL(path, request.headers.get("origin") || request.url);
}

export async function POST(request: Request) {
  const response = isFormRequest(request)
    ? NextResponse.redirect(redirectUrl(request, safeRedirectPath((await request.formData()).get("nextPath"))), 303)
    : NextResponse.json({ ok: true });

  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminCookieOptions(),
    maxAge: 0
  });
  return response;
}
