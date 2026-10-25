import fixture from "@shared/fixtures/demo-stations.json";
import type { DemoDataset, DemoMission, DemoStation } from "./types";

/** Única puerta de entrada a los datos DEMO (los mismos que sirve GET /api/v1/demo/stations). */
export function getDemoDataset(): DemoDataset {
  return {
    label: "DEMO",
    generatedAt: fixture._meta.generated_at,
    stations: fixture.stations as DemoStation[],
    missions: fixture.missions as DemoMission[],
  };
}
