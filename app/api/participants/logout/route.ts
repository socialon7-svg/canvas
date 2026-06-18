import { NextResponse } from "next/server";
import { clearParticipantSessionCookie } from "@/lib/participantAuth";

export async function POST() {
  return clearParticipantSessionCookie(NextResponse.json({ ok: true }));
}
