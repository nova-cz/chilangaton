import type { DemoMission, DemoStation } from "@/features/demo/types";

/** Modelo de presentación del mapa; los contratos de Línea 3 conservan sus nombres. */
export interface Station extends Omit<DemoStation, "bikes_available" | "docks_available" | "example_outlook"> {
  bikes_available: number | null;
  docks_available: number | null;
  example_outlook?: DemoStation["example_outlook"];
  is_renting?: boolean;
  is_returning?: boolean;
  data_ts?: string | null;
}

export interface StationDataset {
  label: string;
  generatedAt: string | null;
  stations: Station[];
  missions: DemoMission[];
}
