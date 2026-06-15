import type { Metadata } from "next";
import ModuStartupPreview from "@/components/ModuStartupPreview";

export const metadata: Metadata = {
  title: "모두의창업 제출물 미리보기 - 하이뷰랩 운영 MVP"
};

export default async function ModuStartupPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModuStartupPreview id={id} />;
}
