/** C4 · Reportes de bicis dañadas. Dueña del esquema: Línea 2. */
export type ReportType = "llanta" | "frenos" | "cadena" | "asiento" | "anclaje" | "otro";
export type ReportSource = "usuario" | "taller" | "deteccion";

export interface ReportIn {
  station_id: string;
  bike_id?: string | null;
  type: ReportType;
  source?: ReportSource;
  /** Hash anónimo; nunca nombre ni teléfono */
  user_hash?: string | null;
}

export interface Report extends ReportIn {
  report_id: string;
  /** ISO 8601 en UTC */
  created_at: string;
  /** Opcionales: los llena la Línea 2 */
  status?: "valido" | "descartado";
  discard_reason?: string | null;
  /** 0 a 1; se calcula al leer */
  confidence?: number | null;
}

/** Aviso de que una persona retiró una bici (lo manda la app). */
export interface Withdrawal {
  bike_id: string;
  user_hash: string;
  /** ISO 8601 en UTC; si falta, ahora */
  taken_at?: string | null;
}
