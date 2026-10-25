import type { Priority } from "./types";

const TZ = "America/Mexico_City";

/** Hora CDMX legible a partir de un ISO en UTC. */
export function cdmxTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : Math.round(v).toLocaleString("es-MX");

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export type Tone = "danger" | "warn" | "neutral";

/** Semáforo del taller, siempre con texto. La puntuación va de 0 a 1 respecto a la peor estación. */
export function priorityLevel(score: number): { tone: Tone; label: string } {
  if (score >= 0.5) return { tone: "danger", label: "Prioridad alta" };
  if (score >= 0.15) return { tone: "warn", label: "Prioridad media" };
  return { tone: "neutral", label: "Prioridad normal" };
}

/** Qué significa cada señal, en palabras del equipo de taller. */
const SIGNALS: Record<string, string> = {
  "bici ignorada": "Hay bicis ancladas hace poco que nadie toma mientras salen muchas otras de la misma estación.",
  "sale mucho en pico": "Salen muchas bicis en horas pico: una bici mala aquí le quita más viajes a la gente.",
};

export const signalHelp = (signal: string) => SIGNALS[signal] ?? signal;

export function stationLabel(row: Pick<Priority, "station_id" | "short_name">, names: Record<string, string>) {
  const code = row.short_name ?? row.station_id;
  return { code, name: names[code] ?? `Estación CE-${code}` };
}
