import type { Metadata } from "next";
import ModuStartupGenerator from "@/components/ModuStartupGenerator";

export const metadata: Metadata = {
  title: "모두의창업 초안 생성 - 하이뷰랩 운영 MVP"
};

export default function ModuStartupPage() {
  return <ModuStartupGenerator />;
}
