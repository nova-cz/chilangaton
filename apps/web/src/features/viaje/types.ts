/**
 * Tipos de la API de Línea 3 (modules/viaje). C3 = ForecastPoint.
 * Probabilidades 0–1. Hora: `ts` y `data_ts` en UTC; `arrival_local` ya en hora CDMX.
 */
export type Light = "verde" | "amarillo" | "rojo";

export interface ViajeStation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  useful_bikes_now: number | null;
  /** Bicis que llevan rato ancladas sin que nadie las tome (Línea 2). Solo aviso; no cambia los porcentajes. */
  ignored_bikes?: number;
  docks_available_now: number | null;
  is_renting: boolean;
  is_returning: boolean;
  data_ts: string | null;
}

export interface ForecastPoint {
  station_id: string;
  ts: string;
  horizon_min: number;
  p_useful_bike: number;
  p_free_dock: number;
}

export interface NearbyRow {
  station_id: string;
  name: string;
  walk_min: number;
  useful_bikes_now: number;
  p_useful_bike: number;
  light: Light;
  data_ts: string;
  text: string;
}

export interface Alternative {
  station_id: string;
  name: string;
  walk_to_destination_min: number;
  p_free_dock: number;
  light: Light;
  detour_min: number;
  grace_min: number;
  score: number;
  text: string;
}

export interface OriginAlternative {
  station_id: string;
  name: string;
  extra_walk_min: number;
  p_useful_bike: number;
  light: Light;
  useful_bikes_now: number;
  score: number;
  text: string;
}

export interface Recommendation {
  mode: string;
  data_ts: string;
  origin: { station_id: string; name: string; p_useful_bike: number; light: Light; text: string; useful_bikes_now?: number };
  /** Opcional: estaciones cerca del origen con más probabilidad de bici útil. */
  origin_alternatives?: OriginAlternative[];
  destination: {
    station_id: string;
    name: string;
    ride_min: number;
    ride_source: string;
    arrival_local: string;
    p_free_dock: number;
    light: Light;
    text: string;
  };
  alternatives: Alternative[];
  advice: string;
}

export interface TripPrefs {
  /** Minutos que aceptas caminar desde otra estación hasta tu destino. */
  maxWalk: 2 | 3 | 5 | 10;
  acceptAlternative: boolean;
  /** Evitar esfuerzo: limita la caminata a 2 min (movilidad reducida, carga, cansancio). */
  avoidEffort: boolean;
  voice: boolean;
  vibration: boolean;
}

export const DEFAULT_PREFS: TripPrefs = {
  maxWalk: 5,
  acceptAlternative: true,
  avoidEffort: false,
  voice: true,
  vibration: true,
};
