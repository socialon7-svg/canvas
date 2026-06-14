import type { Metadata } from "next";
import ParticipantPortal from "@/components/ParticipantPortal";

export const metadata: Metadata = {
  title: "참여자 입장 - 하이뷰랩 운영 MVP"
};

export default function ParticipantPage() {
  return <ParticipantPortal />;
}
