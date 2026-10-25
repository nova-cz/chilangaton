/** C6 · Riesgo de pérdida por estación y franja. Dueña: Línea 2. Es riesgo, no robo comprobado. */
export interface LossRisk {
  station_id: string;
  /** Franja en hora CDMX, p. ej. "18:00-21:00" */
  time_band: string;
  disappeared_bikes: number;
  note: "riesgo, no robo comprobado";
  /** Opcional: código CE del CSV (p. ej. 271-272); station_id es el del feed */
  short_name?: string | null;
}
