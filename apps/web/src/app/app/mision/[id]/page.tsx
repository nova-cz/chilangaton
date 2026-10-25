import { getMissionJourney } from "@/features/missions/data";
import { MissionDetail } from "@/features/missions/mission-detail";
import { MissionNav } from "@/features/missions/mission-nav";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Misión" };

export function generateStaticParams() {
  return getMissionJourney().missions.map((m) => ({ id: m.id }));
}

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = getMissionJourney().missions.find((m) => m.id === id);
  if (!mission) notFound();

  return (
    <div className="min-h-dvh bg-surface">
      <div className="pt-safe" />
      <main className="pt-2">
        <MissionDetail mission={mission} />
      </main>
      <MissionNav />
    </div>
  );
}
