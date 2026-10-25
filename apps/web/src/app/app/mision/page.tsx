import { buildPath, getMissionJourney } from "@/features/missions/data";
import { JourneyBanner, MissionStatsBar } from "@/features/missions/mission-header";
import { MissionNav } from "@/features/missions/mission-nav";
import { MissionPath } from "@/features/missions/mission-path";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Misiones" };

export default function MissionsPage() {
  const { player, missions } = getMissionJourney();
  const done = missions.filter((m) => m.state === "completed").length;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface via-brand-50 to-surface">
      <MissionStatsBar player={player} />
      <main className="px-4 pb-40">
        <div className="mx-auto max-w-md">
          <JourneyBanner done={done} total={missions.length} />
        </div>
        <div className="mt-4">
          <MissionPath nodes={buildPath(missions)} />
        </div>
      </main>
      <MissionNav />
    </div>
  );
}
