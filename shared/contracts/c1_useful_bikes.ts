// C1 · useful_bikes. Dueño: Línea 1 (Bici Útil). Lo usan las Líneas 3 y 4.
// `useful_bikes` ya descuenta las sospechosas de C2: no restar `suspected_expected` otra vez.
// Estación cerrada (`is_renting = false`): useful_bikes = 0 y sus deshabilitadas no cuentan.

export interface UsefulBikes {
  station_id: string;
  /** Hora de la foto del feed, ISO 8601 en UTC. */
  ts: string;
  bikes_available: number;
  bikes_disabled: number;
  /** bikes_available − sospechosas esperadas (C2). */
  useful_bikes: number;
  is_renting: boolean;
  /** Fracción (0–1) de fotos en esa hora CDMX, días hábiles, con bikes_available = 0. */
  pct_empty_hour: number;
  // Opcionales
  is_returning?: boolean | null;
  docks_available?: number | null;
  docks_disabled?: number | null;
  capacity?: number | null;
  suspected_expected?: number | null;
  /** Horas seguidas con al menos una bici deshabilitada (reloj de 36 h). */
  disabled_hours?: number | null;
  name?: string | null;
  /** Código CE (p. ej. 271-272). */
  short_name?: string | null;
  lat?: number | null;
  lon?: number | null;
}
