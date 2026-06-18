import { redirect } from "next/navigation";
import ParticipantModulePlaceholder from "@/components/ParticipantModulePlaceholder";

export default async function ParticipantModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "lean-canvas") redirect("/participant/canvas");
  return <ParticipantModulePlaceholder slug={slug} />;
}
