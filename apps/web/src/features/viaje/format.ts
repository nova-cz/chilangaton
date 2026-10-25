import type { Tone } from "@/features/stations/status";
import type { Light } from "./types";

/** Nunca 0% ni 100% salvo que la estación esté cerrada: es probabilidad, no garantía. */
export function pct(p: number): number {
  return p <= 0 ? 0 : Math.min(99, Math.max(1, Math.round(p * 100)));
}

export const LIGHT_TONE: Record<Light, Tone> = { verde: "ok", amarillo: "warn", rojo: "danger" };

/** El semáforo siempre lleva texto. */
export const LIGHT_LABEL: Record<"bike" | "dock", Record<Light, string>> = {
  bike: { verde: "Muy probable", amarillo: "Podría faltar", rojo: "Difícil" },
  dock: { verde: "Muy probable", amarillo: "Podría llenarse", rojo: "Difícil" },
};

export function lightOf(p: number): Light {
  return p >= 0.8 ? "verde" : p >= 0.5 ? "amarillo" : "rojo";
}

/** "Jesús García - Carlos J. Meneses (Buenavista)" → { street: "Jesús García - Carlos J. Meneses", area: "Buenavista" } */
export function splitName(raw: string): { street: string; area: string | null } {
  const name = raw.replace(/^CE-?[\d-]+\s+/i, "").trim() || raw; // "CE-271-272 Jesús García" → "Jesús García"
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { street: m[1]!, area: m[2]! } : { street: name, area: null };
}

const CDMX_TIME = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false });

export function cdmxTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : CDMX_TIME.format(d);
}

/** "2026-09-29T07:45" (hora CDMX sin zona) → "7:45" */
export function localClock(atLocal: string): string {
  const t = atLocal.split("T")[1] ?? "";
  return t.replace(/^0/, "");
}

/** "2026-09-29T07:45" → "martes 29 sep, 7:45 h" */
export function replayLabel(atLocal: string): string {
  const [d] = atLocal.split("T");
  const date = new Date(`${d}T12:00:00-06:00`);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "short" })
    .format(date)
    .replace(".", "");
  return `${day}, ${localClock(atLocal)} h`;
}

/** "2026-09-29T13:37:00+00:00" → "29 sep, 07:37 h" (hora CDMX) */
export function cdmxStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const f = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return f.format(d).replace(".", "").replace(",", ",") + " h";
}

export function isExampleMode(mode: string): boolean {
  return mode.includes("EJEMPLO");
}

/** Minutos caminando (75 m/min, igual que el motor). */
export function walkMinutes(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.max(1, Math.round((2 * R * Math.asin(Math.sqrt(h))) / 75));
}
