import type { Tone } from "@/features/stations/status";
import type { BiciUtilStation } from "./types";

const TZ = "America/Mexico_City";

/** Hora CDMX legible a partir de un ISO en UTC. */
export function cdmxTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function cdmxDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;

export const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : Math.round(v).toLocaleString("es-MX");

export type UsefulState = { tone: Tone | "closed"; label: string };

/** Semáforo de bici útil, siempre con texto. */
export function usefulState(s: Pick<BiciUtilStation, "is_renting" | "useful_bikes">): UsefulState {
  if (!s.is_renting) return { tone: "closed", label: "Cerrada" };
  if (s.useful_bikes === 0) return { tone: "danger", label: "Sin bici útil" };
  if (s.useful_bikes <= 3) return { tone: "warn", label: "Pocas bicis útiles" };
  return { tone: "ok", label: "Hay bici útil" };
}

export const overClock = (s: Pick<BiciUtilStation, "disabled_hours">, limit = 36) => (s.disabled_hours ?? 0) > limit;
