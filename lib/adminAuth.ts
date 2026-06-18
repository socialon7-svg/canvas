import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "highview_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getSessionSecret() {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET || "";
  if (configuredSecret) return configuredSecret;
  return process.env.NODE_ENV === "production" ? "" : getAdminPassword();
}

export class AdminAuthConfigurationError extends Error {
  constructor() {
    super("운영 환경에 ADMIN_SESSION_SECRET이 설정되지 않았습니다.");
    this.name = "AdminAuthConfigurationError";
  }
}

function toBase64Url(value: Buffer) {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sign(value: string) {
  const secret = getSessionSecret();
  return toBase64Url(createHmac("sha256", secret).update(value).digest());
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return "";

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const matched = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!matched) return "";

  return decodeURIComponent(matched.slice(name.length + 1));
}

export function isAdminPasswordValid(password: string | undefined | null) {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword || !password) return false;
  return safeEqual(password, expectedPassword);
}

export function createAdminSessionToken() {
  if (!getSessionSecret()) throw new AdminAuthConfigurationError();
  const issuedAt = Date.now().toString();
  return `v1.${issuedAt}.${sign(issuedAt)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !getSessionSecret()) return false;

  const [version, issuedAt, signature] = token.split(".");
  if (version !== "v1" || !issuedAt || !signature) return false;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return false;

  const ageMs = Date.now() - issuedAtMs;
  if (ageMs < 0 || ageMs > ADMIN_SESSION_MAX_AGE_SECONDS * 1000) return false;

  return safeEqual(signature, sign(issuedAt));
}

export function isAdminRequest(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    const legacyHeaderPassword = request.headers.get("x-admin-password");
    if (isAdminPasswordValid(legacyHeaderPassword)) return true;
  }

  return verifyAdminSessionToken(getCookieValue(request, ADMIN_SESSION_COOKIE));
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  };
}

export function adminUnauthorizedResponse() {
  return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
}
