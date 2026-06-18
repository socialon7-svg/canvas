import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createParticipant, getProgram, listParticipants } from "@/lib/operationsRepository";
import { toParticipantDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { normalizeAccessCode } from "@/lib/normalize";

const participantCreateSchema = z.object({
  teamId: z.string().trim().optional().nullable(),
  participantCode: z.string().trim().optional(),
  name: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  school: z.string().trim().optional(),
  major: z.string().trim().optional(),
  role: z.string().trim().optional()
});

function makeParticipantCode() {
  return `P-${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "USER"}`;
}

export async function GET(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const { id } = (await params) as { id: string };
    const program = await getProgram(id);
    if (!program) {
      return NextResponse.json({ error: "프로그램을 찾을 수 없습니다." }, { status: 404 });
    }

    const participants = await listParticipants(id);
    return NextResponse.json({ participants: participants.map((participant) => toParticipantDto(participant)) });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 목록 조회 실패");
  }
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const { id } = (await params) as { id: string };
    const program = await getProgram(id);
    if (!program) {
      return NextResponse.json({ error: "프로그램을 찾을 수 없습니다." }, { status: 404 });
    }

    const body = participantCreateSchema.parse(await request.json());
    const participantCode = normalizeAccessCode(body.participantCode || makeParticipantCode());
    const participant = await createParticipant({
      programId: id,
      teamId: body.teamId || null,
      participantCode,
      name: body.name || participantCode,
      email: body.email,
      phone: body.phone,
      school: body.school,
      major: body.major,
      role: body.role
    });

    return NextResponse.json({ participant: toParticipantDto(participant) }, { status: 201 });
  } catch (error) {
    return handleOperationsApiError(error, "참여자 생성 실패");
  }
}
