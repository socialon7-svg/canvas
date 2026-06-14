import type { Metadata } from "next";
import InternalPortal from "@/components/InternalPortal";

export const metadata: Metadata = {
  title: "내부직원 로그인 - 하이뷰랩 운영 MVP"
};

export default function InternalPage() {
  return <InternalPortal />;
}
