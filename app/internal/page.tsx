import type { Metadata } from "next";
import { Suspense } from "react";
import InternalPortal from "@/components/InternalPortal";

export const metadata: Metadata = {
  title: "내부직원 로그인 - 하이뷰랩 운영 MVP"
};

export default function InternalPage() {
  return (
    <Suspense fallback={<div className="px-5 py-10 text-sm text-gray-600">내부직원 화면을 불러오는 중입니다...</div>}>
      <InternalPortal />
    </Suspense>
  );
}
