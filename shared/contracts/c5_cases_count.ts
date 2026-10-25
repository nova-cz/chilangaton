/**
 * C5 · cases_count — Línea 5 (Regreso Seguro) → Línea 1 (Bici Útil y supervisión).
 * Endpoint: GET /api/v1/cases/count
 *
 * Solo aparecen estaciones con al menos un caso; las que no salen tienen 0 y 0.
 * Los casos sin estación conocida no se cuentan aquí (sí salen en GET /cases).
 * Esquema Pydantic equivalente: shared/contracts/c5_cases_count.py
 */

export interface CasesCount {
  /** station_id del feed GBFS (no el código "CE-xxx") */
  station_id: string;
  /** Casos abiertos cuya última estación conocida es esta */
  open_cases: number;
  /** Casos que terminaron con la bici reincorporada al servicio en esta estación */
  reincorporated: number;
}

export interface CasesCountResponse {
  /** Hora del dato, ISO 8601 en UTC; se muestra en hora CDMX */
  generated_at: string;
  stations: CasesCount[];
}
