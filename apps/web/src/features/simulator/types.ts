/** Forma de modules/distribucion/fixtures/*.json (generados por engine.py y contraflujo.py). */
export interface SeriesPoint {
  ts: string; // UTC
  empty_stations: number;
  full_stations: number;
  empty_stations_target: number;
  full_stations_target: number;
}

export interface ScenarioTotals {
  empty_station_hours: number;
  full_station_hours: number;
  empty_station_hours_target: number;
  full_station_hours_target: number;
  lost_trips: number;
  diverted_arrivals: number;
  bikes_moved: number;
}

export interface ScenarioResult {
  adoption_pct: number;
  contraflow_trips: number;
  adopting_trips: number;
  totals: ScenarioTotals;
  series: SeriesPoint[];
}

export interface SimulationResults {
  label: "SIMULADO";
  seed: number;
  date: string;
  window: { start: string; end: string; tz: string; step_minutes: number };
  inventory_snapshot_utc: string;
  stations: number;
  trips_in_window: number;
  target_zones: string[];
  assumptions: string[];
  scenarios: Record<"true" | "false", Record<string, ScenarioResult>>;
}

export interface ContraflujoResult {
  label: string;
  zones?: Record<string, { role: string; radius_m: number; stations: number; center?: [number, number] }>;
  window: { start: string; end: string; days: number };
  trips_per_day_avg: number;
  trips_per_day_min: number;
  trips_per_day_max: number;
  by_zone_pair: { from: string; to: string; trips_per_day: number }[];
  criterion: string;
  viable: boolean;
  conclusion: string;
}
