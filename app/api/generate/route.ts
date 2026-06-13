import { NextResponse } from "next/server";
import { generateLeanCanvas } from "@/lib/ai";
import type { ParticipantInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ParticipantInput;
    const canvas = await generateLeanCanvas(input);
    return NextResponse.json({ canvas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
