import type { Metadata } from "next";
import InputForm from "@/components/InputForm";

export const metadata: Metadata = {
  title: "린캔버스 과제 작성 - 하이뷰랩 운영 MVP"
};

export default function ParticipantCanvasPage() {
  return <InputForm requireParticipantSession />;
}
