import { apiGet } from "@/lib/api";
import { config } from "@/lib/config";
import snapshot from "./demo-snapshot.json";
import type { ForecastPoint, NearbyRow, Recommendation, TripPrefs, ViajeStation } from "./types";

/**
 * Única puerta de datos de Línea 3.
 * - demo: escenario fijo exportado del motor (`python -m modules.viaje.export_demo`), martes 29 sep 07:45.
 * - api: FastAPI /api/v1/viaje/*. En la demo en vivo fijamos la misma hora con `at` para que la historia cuadre.
 */
const snap = snapshot as unknown as {
  _meta: { at_local: string };
  mode: string;
  home: { lat: number; lon: number; label: string };
  stations: ViajeStation[];
  nearby: NearbyRow[];
  forecast: Record<string, ForecastPoint[]>;
  recommendations: Record<string, Omit<Recommendation, "preferences">>;
};

export const DEMO_AT = snap._meta.at_local;
export const HOME = snap.home;
export const FORECAST_HORIZONS = [15, 30, 45, 60, 75, 90] as const;
const isDemo = config.dataMode === "demo";
const at = process.env.NEXT_PUBLIC_DEMO_AT ?? DEMO_AT;

export interface Sourced<T> {
  data: T;
  /** "EJEMPLO", "VIVO + baseline de EJEMPLO", "REAL"… lo decide el motor. */
  mode: string;
}

export async function getStations(): Promise<Sourced<ViajeStation[]>> {
  if (isDemo) return { data: snap.stations, mode: snap.mode };
  const r = await apiGet<{ mode: string; stations: ViajeStation[] }>(`/viaje/stations?at=${at}`);
  return { data: r.stations, mode: r.mode };
}

export async function getNearby(lat = HOME.lat, lon = HOME.lon): Promise<Sourced<NearbyRow[]>> {
  if (isDemo) return { data: snap.nearby, mode: snap.mode };
  const r = await apiGet<{ mode: string; stations: NearbyRow[] }>(`/viaje/nearby?lat=${lat}&lon=${lon}&at=${at}&limit=6`);
  return { data: r.stations, mode: r.mode };
}

export async function getForecast(id: string): Promise<Sourced<{ station: ViajeStation; forecast: ForecastPoint[] }> | null> {
  if (isDemo) {
    const station = snap.stations.find((s) => s.station_id === id);
    const forecast = snap.forecast[id];
    return station && forecast ? { data: { station, forecast }, mode: snap.mode } : null;
  }
  const r = await apiGet<{ mode: string; station: ViajeStation; forecast: ForecastPoint[] }>(
    `/viaje/stations/${encodeURIComponent(id)}/forecast?at=${at}&horizons=${FORECAST_HORIZONS.join(",")}`,
  );
  return { data: { station: r.station, forecast: r.forecast }, mode: r.mode };
}

export async function getRecommendation(origin: string, destination: string, prefs: TripPrefs): Promise<Recommendation> {
  const walk = prefs.avoidEffort ? 2 : prefs.maxWalk;
  if (isDemo) {
    const r = snap.recommendations[`${origin}>${destination}>${walk}`];
    if (!r) throw new Error("Esa combinación no está en el escenario de ejemplo.");
    if (prefs.acceptAlternative || r.alternatives.length === 0) return r;
    // Misma regla que el motor cuando no aceptas otra estación.
    return {
      ...r,
      alternatives: [],
      advice: "Tu destino podría estar lleno. Elegiste no cambiar de estación: te avisaremos antes de llegar.",
    };
  }
  const q = new URLSearchParams({
    origin,
    destination,
    at,
    max_walk: String(walk),
    accept_alt: String(prefs.acceptAlternative),
    avoid_effort: String(prefs.avoidEffort),
  });
  return apiGet<Recommendation>(`/viaje/recommendations?${q}`);
}
