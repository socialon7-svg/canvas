import type { Metadata } from "next";
import ParticipantJoinClient from "@/components/ParticipantJoinClient";

export const metadata: Metadata = {
  title: "참여자 매직링크 입장 - 하이뷰랩 운영 MVP"
};

export default async function ParticipantJoinPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ParticipantJoinClient token={params.token || ""} />;
}
