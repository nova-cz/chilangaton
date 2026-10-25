/** C2 · Prioridad de taller por estación. Dueña: Línea 2. */
export interface Priority {
  station_id: string;
  /** ISO 8601 en UTC */
  ts: string;
  suspected_expected: number;
  priority_score: number;
  top_signals: string[];
  /** Opcional: salidas promedio por día hábil en pico */
  peak_departures?: number | null;
  /** Opcional: % del tiempo vacía en pico; null = pendiente feed L1 */
  empty_share?: number | null;
  /** Opcional: código CE del CSV (p. ej. 271-272); station_id es el del feed */
  short_name?: string | null;
}
