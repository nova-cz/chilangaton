import { ApiError, apiGet } from "@/lib/api";
import { config } from "@/lib/config";

/** Tipos de modules/regreso/schemas.py (no son contrato entre líneas). */
export type ReturnStatus = "revisando" | "vemos_una_mas" | "sin_cambio" | "no_responde";

export interface StationSnapshot {
  bikes_available: number;
  bikes_disabled: number;
  docks_available: number | null;
  observed_at: string;
  source: "feed" | "app";
}

export interface ReturnCheck {
  return_id: string;
  station_id: string;
  status: ReturnStatus;
  message: string;
  created_at: string;
  checked_at: string;
  window_ends_at: string;
  baseline: StationSnapshot | null;
  latest: StationSnapshot | null;
}

export interface StationOption {
  station_id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export type BikeState =
  | "en_estacion"
  | "en_viaje"
  | "traslado"
  | "taller"
  | "devolucion_en_duda"
  | "en_revision"
  | "localizada"
  | "recuperada"
  | "reincorporada";

export type IncidentType = "robo" | "perdida" | "anclaje" | "viaje_largo" | "discrepancia";
export type Actor = "app" | "sistema" | "guardian" | "operador";

export interface CaseEvent {
  ts: string;
  from_state: BikeState | null;
  to_state: BikeState;
  actor: Actor;
  note: string | null;
}

export interface Case {
  case_id: string;
  type: IncidentType;
  source: Actor;
  state: BikeState;
  is_open: boolean;
  station_id: string | null;
  bike_id: string | null;
  return_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  history: CaseEvent[];
  next_states: BikeState[];
  /** Escenario SIMULADO: se muestra con <SimulatedBadge/> y no cuenta en indicadores ni en C5. */
  simulated: boolean;
}

export interface Scenario {
  key: string;
  title: string;
  story: string;
  expected: BikeState;
  outcome: string;
}

export interface ScenarioRun extends Scenario {
  obtained: BikeState;
  passed: boolean;
  case: Case;
}

export interface IncidentIn {
  type: IncidentType;
  source: Actor;
  station_id?: string;
  bike_id?: string;
  return_id?: string;
  note?: string;
}

/** C6 · riesgo de pérdida (Línea 2). Con ?ids=feed, station_id es el del feed y short_name el código CE. */
export interface LossRisk {
  station_id: string;
  time_band: string;
  disappeared_bikes: number;
  note: string;
  short_name?: string | null;
}

export interface LossRiskResponse {
  /** "REAL" (viajes oficiales) o "EJEMPLO" (datos de ejemplo de la Línea 2) */
  mode: string;
  total_bikes: number;
  items: LossRisk[];
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.apiUrl}${config.apiPrefix}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(res.status, err?.error?.code ?? `http_${res.status}`, err?.error?.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

export const regresoApi = {
  stations: () => apiGet<StationOption[]>("/returns/stations"),
  startReturn: (stationId: string) => apiPost<ReturnCheck>("/returns", { station_id: stationId }),
  checkReturn: (returnId: string) => apiGet<ReturnCheck>(`/returns/${encodeURIComponent(returnId)}`, { cache: "no-store" }),
  cases: () => apiGet<Case[]>("/cases", { cache: "no-store" }),
  openIncident: (body: IncidentIn) => apiPost<{ case: Case; created: boolean }>("/incidents", body),
  transition: (caseId: string, body: { to_state: BikeState; actor: Actor; note?: string }) =>
    apiPost<Case>(`/cases/${encodeURIComponent(caseId)}/transitions`, body),
  assign: (caseId: string, body: { guardian_id: string; actor: Actor }) =>
    apiPost<Case>(`/cases/${encodeURIComponent(caseId)}/assign`, body),
  scenarios: () => apiGet<Scenario[]>("/scenarios"),
  lossRisk: () => apiGet<LossRiskResponse>("/taller/loss-risk?ids=feed&limit=50"),
  /** C4 · reporte al taller de la Línea 2 (solo daños; aquí, anclajes que no registraron). */
  reportToTaller: (body: { station_id: string; type: "anclaje"; source: "usuario"; bike_id?: string }) =>
    apiPost<{ report_id: string }>("/taller/reports", body),
  runScenario: (key: string) => apiPost<ScenarioRun>(`/scenarios/${encodeURIComponent(key)}/run`, {}),
};

export function bikesTotal(snapshot: StationSnapshot | null): number | null {
  return snapshot ? snapshot.bikes_available + snapshot.bikes_disabled : null;
}
