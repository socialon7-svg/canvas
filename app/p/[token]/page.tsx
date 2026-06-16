import { redirect } from "next/navigation";
import { getParticipantJoinPath } from "@/lib/joinLink";

export default async function ShortParticipantJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(getParticipantJoinPath(token));
}
