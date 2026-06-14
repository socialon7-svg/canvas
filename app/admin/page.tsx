import type { Metadata } from "next";
import AdminList from "@/components/AdminList";

export const metadata: Metadata = {
  title: "관리자 로그인 - AI 린캔버스"
};

export default function AdminPage() {
  return <AdminList />;
}
