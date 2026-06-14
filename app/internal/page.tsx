import type { Metadata } from "next";
import InternalPortal from "@/components/InternalPortal";

export const metadata: Metadata = {
  title: "내부직원 로그인 - AI 린캔버스"
};

export default function InternalPage() {
  return <InternalPortal />;
}
