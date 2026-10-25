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
};

export function bikesTotal(snapshot: StationSnapshot | null): number | null {
  return snapshot ? snapshot.bikes_available + snapshot.bikes_disabled : null;
}
