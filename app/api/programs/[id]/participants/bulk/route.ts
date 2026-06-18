import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorizedResponse, isAdminRequest } from "@/lib/adminAuth";
import { createParticipants, getProgram } from "@/lib/operationsRepository";
import { toParticipantDto } from "@/lib/operationsDto";
import { handleOperationsApiError } from "@/lib/operationsApiUtils";
import { normalizeAccessCode } from "@/lib/normalize";

const bulkParticipantSchema = z.object({
  count: z.number().int().min(1).max(300).optional(),
  school: z.string().trim().optional(),
  participants: z
    .array(
      z.object({
        teamId: z.string().trim().optional().nullable(),
        participantCode: z.string().trim().optional(),
        name: z.string().trim().optional(),
        email: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        school: z.string().trim().optional(),
        major: z.string().trim().optional(),
        role: z.string().trim().optional()
      })
    )
    .optional()
});

type BulkParticipantInput = {
  teamId?: string | null;
  participantCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  school?: string;
  major?: string;
  role?: string;
};

function makeParticipantCode() {
  return `P-${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "USER"}`;
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

    const body = bulkParticipantSchema.parse(await request.json());
    const source: BulkParticipantInput[] =
      body.participants && body.participants.length
        ? body.participants
        : Array.from({ length: body.count || 1 }, () => ({ school: body.school || "" }));
    const participants = await createParticipants(
      source.map((participant) => {
        const participantCode = normalizeAccessCode(participant.participantCode || makeParticipantCode());
        return {
          programId: id,
          teamId: participant.teamId || null,
          participantCode,
          name: participant.name || participantCode,
          email: participant.email,
          phone: participant.phone,
          school: participant.school ?? body.school,
          major: participant.major,
          role: participant.role
        };
      })
    );

    return NextResponse.json(
      { participants: participants.map((participant) => toParticipantDto(participant)) },
      { status: 201 }
    );
  } catch (error) {
    return handleOperationsApiError(error, "참여자 일괄 생성 실패");
  }
}
