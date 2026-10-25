import { getDemoDataset } from "@/features/demo/demo-data";
import fixture from "@shared/fixtures/demo-missions.json";
import type { MissionState, MissionView, PathNode, PlayerStats } from "./types";

/** Única puerta de entrada a las misiones DEMO (shared/fixtures/demo-missions.json). */
export function getMissionJourney(): { player: PlayerStats; missions: MissionView[] } {
  const stations = new Map(getDemoDataset().stations.map((s) => [s.id, s]));
  const missions: MissionView[] = [];
  for (const m of fixture.missions) {
    const from = stations.get(m.from_station_id);
    const to = stations.get(m.to_station_id);
    if (!from || !to) continue;
    missions.push({
      id: m.id,
      title: m.title,
      window_label: m.window_label,
      points: m.points,
      state: m.state as MissionState,
      from: { id: from.id, name: from.name, zone: from.zone },
      to: { id: to.id, name: to.name, zone: to.zone },
    });
  }
  return { player: fixture.player, missions };
}

/** Camino: un cofre después de cada 3 misiones. La misión actual es la primera disponible. */
export function buildPath(missions: MissionView[]): PathNode[] {
  const currentId = missions.find((m) => m.state === "available")?.id;
  const nodes: PathNode[] = [];
  missions.forEach((mission, index) => {
    nodes.push({ kind: "mission", mission, index, current: mission.id === currentId });
    if ((index + 1) % 3 === 0) {
      const group = missions.slice(index - 2, index + 1);
      nodes.push({ kind: "chest", id: `chest-${(index + 1) / 3}`, unlocked: group.every((m) => m.state === "completed") });
    }
  });
  return nodes;
}
