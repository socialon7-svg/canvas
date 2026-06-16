import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminCookieOptions, createAdminSessionToken, isAdminPasswordValid } from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    if (!isAdminPasswordValid(body.password)) {
      return NextResponse.json({ ok: false, error: "암호가 올바르지 않습니다." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
