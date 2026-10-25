import type { UsefulBikes } from "../../../../../shared/contracts/c1_useful_bikes";

/** Fila de C1 con los opcionales que usa el panel (nombre y coordenadas). */
export type BiciUtilStation = UsefulBikes & {
  name: string;
  lat: number;
  lon: number;
};

export interface HourPoint {
  hour: number;
  in_service: boolean;
  bikes_available: number;
  bikes_disabled: number;
  useful_bikes: number;
  pct_docked_unusable: number;
  pct_stations_empty: number;
  pct_stations_no_useful: number;
  snapshots: number;
}

export interface ClockRow {
  station_id: string;
  name: string;
  hours: number;
  bikes_disabled: number;
  since: string;
}

export interface Clock {
  ts: string | null;
  limit_h: number;
  stations_over_limit: number;
  over_limit: ClockRow[];
  window: { from: string; to: string; episodes_over_limit: number; stations_with_episode: number };
}

export interface Contract {
  mode: string;
  c2_mode: string;
  ts: string | null;
  window: Clock["window"];
  useful_peak_vs_5am: {
    useful_at_5: number | null;
    useful_at_peak: Record<string, number>;
    ratio_peak_min_vs_5: number | null;
    note: string;
  };
  pct_time_empty: {
    value: number | null;
    value_no_useful: number | null;
    value_peak: number | null;
    limit: number;
    meets: boolean;
    note: string;
  };
  stations_over_36h: { value: number; episodes_in_window: number; stations_with_episode: number; limit_h: number };
}

/** De dónde viene lo que se ve: foto grabada en el repo, API en vivo o respaldo porque la API falló. */
export type Source = "grabado" | "api" | "respaldo";

export interface BiciUtilData {
  mode: string;
  c2_mode: string;
  at_local: string;
  stations: BiciUtilStation[];
  hourly: HourPoint[];
  clock: Clock;
  contract: Contract;
}
