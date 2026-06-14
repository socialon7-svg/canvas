import type { Metadata } from "next";
import ParticipantPortal from "@/components/ParticipantPortal";

export const metadata: Metadata = {
  title: "참여자 입장 - AI 린캔버스"
};

export default function ParticipantPage() {
  return <ParticipantPortal />;
}
