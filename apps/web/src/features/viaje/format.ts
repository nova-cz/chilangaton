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
export function splitName(name: string): { street: string; area: string | null } {
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

export function isExampleMode(mode: string): boolean {
  return mode.includes("EJEMPLO");
}
