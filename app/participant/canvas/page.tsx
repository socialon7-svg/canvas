import type { Metadata } from "next";
import InputForm from "@/components/InputForm";

export const metadata: Metadata = {
  title: "린캔버스 작성 - AI 린캔버스"
};

export default function ParticipantCanvasPage() {
  return <InputForm requireParticipantSession />;
}
