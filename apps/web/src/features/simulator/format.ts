/** Hora CDMX (24 h) de un instante UTC. */
export function cdmxTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "America/Mexico_City" });
}

export const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
export const nf0 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** Cambio de `value` contra `base` en texto con signo: "−0,8 h (−2,3 %)". */
export function delta(value: number, base: number, unit: string): string {
  const diff = value - base;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const pct = base === 0 ? "" : ` (${sign}${nf.format(Math.abs((diff / base) * 100))} %)`;
  return `${sign}${nf.format(Math.abs(diff))} ${unit}${pct}`;
}
