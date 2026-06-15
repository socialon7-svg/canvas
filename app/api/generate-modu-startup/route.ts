import { NextResponse } from "next/server";
import { generateModuStartupDraft } from "@/lib/ai";
import type { ModuStartupInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ModuStartupInput;
    const draft = await generateModuStartupDraft(input);

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
