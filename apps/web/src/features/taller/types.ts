export interface PriorityRow {
  station_id: string;
  name: string;
  ts: string;
  suspected_expected: number;
  priority_score: number;
  top_signals: string[];
  peak_departures?: number | null;
}

export interface LossRow {
  station_id: string;
  name: string;
  time_band: string;
  disappeared_bikes: number;
  note: string;
}

export interface Validation {
  ignored_rate: number;
  others_rate: number;
  ratio: number;
  ignored_bikes: number;
  definition: string;
}

export interface TallerData {
  mode: string;
  ts: string | null;
  totals: { stations: number; suspected: number };
  priority: PriorityRow[];
  loss_risk: LossRow[];
  loss_total: number;
  validation: Validation | null;
}

export type Source = "grabado" | "api" | "respaldo";
