import type { Metadata } from "next";
import AdminList from "@/components/AdminList";

export const metadata: Metadata = {
  title: "관리자 로그인 - 하이뷰랩 운영 MVP"
};

export default function AdminPage() {
  return <AdminList />;
}
