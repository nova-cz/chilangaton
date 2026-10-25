import { cn } from "@/lib/cn";
import { SCENARIOS, type Scenario } from "./scenarios";
import { nf, nf0 } from "./format";
import type { ScenarioResult, ScenarioTotals } from "./types";

const ROWS: { label: string; key: keyof ScenarioTotals; unit?: string; fmt?: (n: number) => string }[] = [
  { label: "Horas estación vacía · Buenavista y San Rafael", key: "empty_station_hours_target", unit: "h" },
  { label: "Horas estación llena · Buenavista y San Rafael", key: "full_station_hours_target", unit: "h" },
  { label: "Horas estación vacía · toda la red", key: "empty_station_hours", unit: "h" },
  { label: "Horas estación llena · toda la red", key: "full_station_hours", unit: "h" },
  { label: "Viajes perdidos (salida sin bicis)", key: "lost_trips", fmt: nf0.format },
  { label: "Bicis movidas por misiones", key: "bikes_moved", fmt: nf0.format },
];

/** Comparación con los totales reales del JSON; la columna elegida va resaltada. */
export function ComparisonTable({ results, selected }: { results: Record<string, ScenarioResult>; selected: Scenario }) {
  return (
    <div className="overflow-x-auto px-5 pb-5">
      <table className="w-full min-w-[460px] text-sm">
        <caption className="sr-only">Métricas simuladas por escenario de adopción</caption>
        <thead>
          <tr className="text-left text-xs text-ink-muted">
            <th scope="col" className="py-2 font-semibold">Métrica</th>
            {SCENARIOS.map((s) => (
              <th key={s} scope="col" className={cn("px-2 py-2 text-right font-semibold", s === selected && "rounded-t-xl bg-brand-100 text-brand-900")}>
                {s}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="py-3 pr-2 text-left font-medium">{row.label}</th>
              {SCENARIOS.map((s) => {
                const v = results[String(s)]?.totals[row.key];
                return (
                  <td key={s} className={cn("px-2 py-3 text-right tabular-nums", s === selected && "bg-brand-100/60 font-bold")}>
                    {v === undefined ? "—" : row.fmt ? row.fmt(v) : `${nf.format(v)} ${row.unit ?? ""}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
