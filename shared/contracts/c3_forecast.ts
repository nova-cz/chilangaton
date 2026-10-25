/**
 * C3 · forecast (dueño: Línea 3). Espejo de shared/contracts/c3_forecast.py.
 * GET /api/v1/viaje/stations/{id}/forecast  ·  GET /api/v1/viaje/forecast?station_ids=&horizons=
 * Probabilidades 0–1. `ts` en UTC; mostrar en hora CDMX. Semáforo: verde ≥ 0.8, amarillo ≥ 0.5, rojo < 0.5, siempre con texto.
 */
export interface ForecastPoint {
  station_id: string;
  ts: string;
  horizon_min: number;
  p_useful_bike: number;
  p_free_dock: number;
}

export interface ForecastResponse {
  mode: string;
  forecast: ForecastPoint[];
}
