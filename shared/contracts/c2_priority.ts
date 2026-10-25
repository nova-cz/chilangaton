/** C2 · Prioridad de taller por estación. Dueña: Línea 2. */
export interface Priority {
  station_id: string;
  /** ISO 8601 en UTC */
  ts: string;
  suspected_expected: number;
  priority_score: number;
  top_signals: string[];
}
