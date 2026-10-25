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
}
