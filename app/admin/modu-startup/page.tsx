import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "모두의창업 제출 목록 - 하이뷰랩 운영 MVP"
};

export default function ModuStartupAdminPage() {
  redirect("/internal?tab=moduStartup");
}
