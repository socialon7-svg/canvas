import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  AdminAuthConfigurationError,
  adminCookieOptions,
  createAdminSessionToken,
  isAdminPasswordValid
} from "@/lib/adminAuth";

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

function redirectWithCookie(request: Request, path: string, ok: boolean) {
  const url = redirectUrl(request, path);
  if (!ok) url.searchParams.set("adminError", "1");
  const response = NextResponse.redirect(url, 303);

  if (ok) {
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminCookieOptions());
  }

  return response;
}

export async function POST(request: Request) {
  try {
    if (isFormRequest(request)) {
      const formData = await request.formData();
      const password = String(formData.get("password") || "");
      const nextPath = safeRedirectPath(formData.get("nextPath"));
      return redirectWithCookie(request, nextPath, isAdminPasswordValid(password));
    }

    const body = (await request.json()) as { password?: string };
    if (!isAdminPasswordValid(body.password)) {
      return NextResponse.json({ ok: false, error: "암호가 올바르지 않습니다." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
