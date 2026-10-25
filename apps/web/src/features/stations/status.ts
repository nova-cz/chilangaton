import type { ExampleOutlook } from "@/features/demo/types";

export type Tone = "ok" | "warn" | "danger";

/** Semáforo siempre con texto (nunca solo color). */
export function bikesStatus(bikes: number): { tone: Tone; label: string } {
  if (bikes === 0) return { tone: "danger", label: "Sin bicis" };
  if (bikes <= 3) return { tone: "warn", label: "Pocas bicis" };
  return { tone: "ok", label: "Hay bicis" };
}

export function docksStatus(docks: number): { tone: Tone; label: string } {
  if (docks === 0) return { tone: "danger", label: "Sin anclajes" };
  if (docks <= 3) return { tone: "warn", label: "Pocos anclajes" };
  return { tone: "ok", label: "Hay anclajes" };
}

/** Peor de los dos estados: define el color del marcador. */
export function stationTone(bikes: number, docks: number): Tone {
  const order: Tone[] = ["ok", "warn", "danger"];
  const a = order.indexOf(bikesStatus(bikes).tone);
  const b = order.indexOf(docksStatus(docks).tone);
  return order[Math.max(a, b)] ?? "ok";
}

export const OUTLOOK_COPY: Record<ExampleOutlook, { tone: Tone; label: string }> = {
  ok: { tone: "ok", label: "Suele haber bicis y anclajes" },
  low: { tone: "warn", label: "Podrían escasear las bicis" },
  empty: { tone: "danger", label: "Podría quedarse sin bicis" },
  full: { tone: "warn", label: "Podría quedarse sin anclajes" },
};

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-brand-600",
  warn: "text-warning-700",
  danger: "text-danger-700",
};

export const TONE_DOT: Record<Tone, string> = {
  ok: "bg-brand-500",
  warn: "bg-warning-500",
  danger: "bg-danger-500",
};

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
