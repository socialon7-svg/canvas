import type { Metadata } from "next";
import ModuStartupAdminList from "@/components/ModuStartupAdminList";

export const metadata: Metadata = {
  title: "모두의창업 제출 목록 - 하이뷰랩 운영 MVP"
};

export default function ModuStartupAdminPage() {
  return <ModuStartupAdminList />;
}
