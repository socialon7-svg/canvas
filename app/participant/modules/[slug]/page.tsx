import ParticipantModulePlaceholder from "@/components/ParticipantModulePlaceholder";

export default async function ParticipantModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ParticipantModulePlaceholder slug={slug} />;
}
