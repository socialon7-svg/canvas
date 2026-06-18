import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { hasSupabaseServerConfig } from "@/lib/supabaseServer";

export const PARTICIPANT_SESSION_COOKIE = "highview_participant_session";
export const PARTICIPANT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface ParticipantSessionPayload {
  programId: string;
  participantId: string;
  issuedAt: number;
  expiresAt: number;
}

export class ParticipantAuthConfigurationError extends Error {
  constructor() {
    super("참여자 세션 서명 키가 설정되지 않았습니다. PARTICIPANT_SESSION_SECRET을 설정해주세요.");
    this.name = "ParticipantAuthConfigurationError";
  }
}

function getParticipantSessionSecret() {
  if (process.env.PARTICIPANT_SESSION_SECRET) return process.env.PARTICIPANT_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") return "";
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function toBase64Url(value: Buffer) {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(encodedPayload: string) {
  const secret = getParticipantSessionSecret();
  if (!secret) throw new ParticipantAuthConfigurationError();
  return toBase64Url(createHmac("sha256", secret).update(encodedPayload).digest());
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return "";
  const matched = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : "";
}

export function createParticipantSessionToken(input: { programId: string; participantId: string }) {
  const issuedAt = Date.now();
  const payload: ParticipantSessionPayload = {
    programId: input.programId,
    participantId: input.participantId,
    issuedAt,
    expiresAt: issuedAt + PARTICIPANT_SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `v1.${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyParticipantSessionToken(token: string | undefined | null) {
  if (!token || !getParticipantSessionSecret()) return null;
  const [version, encodedPayload, signature] = token.split(".");
  if (version !== "v1" || !encodedPayload || !signature) return null;

  let expectedSignature = "";
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as ParticipantSessionPayload;
    if (!payload.programId || !payload.participantId) return null;
    if (!Number.isFinite(payload.issuedAt) || !Number.isFinite(payload.expiresAt)) return null;
    if (payload.issuedAt > Date.now() || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getParticipantSession(request: Request) {
  return verifyParticipantSessionToken(getCookieValue(request, PARTICIPANT_SESSION_COOKIE));
}

export function participantCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PARTICIPANT_SESSION_MAX_AGE_SECONDS
  };
}

export function setParticipantSessionCookie(
  response: NextResponse,
  input: { programId: string; participantId: string }
) {
  response.cookies.set(PARTICIPANT_SESSION_COOKIE, createParticipantSessionToken(input), participantCookieOptions());
  return response;
}

export function clearParticipantSessionCookie(response: NextResponse) {
  response.cookies.set(PARTICIPANT_SESSION_COOKIE, "", { ...participantCookieOptions(), maxAge: 0 });
  return response;
}

type ParticipantAuthorization =
  | { ok: true; mode: "participant"; session: ParticipantSessionPayload }
  | { ok: true; mode: "admin" | "demo"; session: null }
  | { ok: false; response: NextResponse };

export function authorizeParticipantRequest(
  request: Request,
  expected: { programId?: string; participantId?: string },
  options: { allowAdmin?: boolean } = {}
): ParticipantAuthorization {
  if (!hasSupabaseServerConfig()) return { ok: true, mode: "demo", session: null };
  if (options.allowAdmin && isAdminRequest(request)) return { ok: true, mode: "admin", session: null };
  if (!getParticipantSessionSecret()) {
    return {
      ok: false,
      response: NextResponse.json({ error: new ParticipantAuthConfigurationError().message }, { status: 500 })
    };
  }

  const session = getParticipantSession(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "참여자 인증이 필요합니다." }, { status: 401 })
    };
  }
  if (
    (expected.programId && expected.programId !== session.programId) ||
    (expected.participantId && expected.participantId !== session.participantId)
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "다른 참여자의 데이터에는 접근할 수 없습니다." }, { status: 403 })
    };
  }
  return { ok: true, mode: "participant", session };
}

export function authorizeOperationRequest(
  request: Request,
  operation: { programId?: string; participantId?: string } | undefined,
  options: { allowAdmin?: boolean } = { allowAdmin: true }
): ParticipantAuthorization {
  const initialAuthorization = authorizeParticipantRequest(request, {}, options);
  if (!initialAuthorization.ok) return initialAuthorization;

  if (
    initialAuthorization.mode === "participant" &&
    (!operation?.programId || !operation.participantId)
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "참여자 운영 정보가 없는 요청입니다." }, { status: 403 })
    };
  }

  return authorizeParticipantRequest(
    request,
    { programId: operation?.programId, participantId: operation?.participantId },
    options
  );
}
