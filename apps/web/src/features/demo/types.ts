/**
 * Tipos de los fixtures DEMO. NO son contratos entre líneas: los contratos reales
 * (C1 useful_bikes, C3 forecast, …) viven en shared/contracts/ y los define cada dueño.
 */
export type Horizon = 15 | 30 | 60;
export const HORIZONS: readonly Horizon[] = [15, 30, 60];

/** Estado cualitativo de ejemplo. Sin porcentajes: el pronóstico real es de la Línea 3. */
export type ExampleOutlook = "ok" | "low" | "empty" | "full";

export interface DemoStation {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  capacity: number;
  bikes_available: number;
  docks_available: number;
  example_outlook: Record<`${Horizon}`, ExampleOutlook>;
}

export interface DemoMission {
  id: string;
  from_station_id: string;
  to_station_id: string;
  title: string;
  reward: { kind: "virtual"; label: string };
  window_label: string;
}

export interface DemoDataset {
  label: "DEMO";
  generatedAt: string;
  stations: DemoStation[];
  missions: DemoMission[];
}
