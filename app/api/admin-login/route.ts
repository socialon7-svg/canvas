import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const expectedPassword = process.env.ADMIN_PASSWORD;
    return NextResponse.json({ ok: Boolean(expectedPassword && body.password === expectedPassword) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
