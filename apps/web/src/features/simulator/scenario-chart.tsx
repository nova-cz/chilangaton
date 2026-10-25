import { cn } from "@/lib/cn";
import { SCENARIOS, type Scenario } from "./scenarios";
import { cdmxTime } from "./format";
import type { ScenarioResult } from "./types";

const W = 640;
const H = 280;
const M = { top: 14, right: 14, bottom: 30, left: 34 };

/** Una línea por escenario; el elegido va grueso. Colores de la marca, de más claro a más oscuro. */
const LINE: Record<Scenario, string> = {
  0: "text-ink-soft",
  5: "text-brand-300",
  10: "text-brand-500",
  20: "text-brand-900",
};

/** Gráfica de líneas en SVG propio: estaciones vacías de Buenavista y San Rafael cada 15 min (CDMX). */
export function ScenarioChart({ results, selected }: { results: Record<string, ScenarioResult>; selected: Scenario }) {
  const base = results["0"]?.series ?? [];
  if (base.length === 0) return null;
  const maxY = Math.max(1, ...SCENARIOS.flatMap((s) => (results[String(s)]?.series ?? []).map((p) => p.empty_stations_target)));
  const step = maxY <= 6 ? 1 : maxY <= 14 ? 2 : 5;
  const top = Math.ceil(maxY / step) * step;
  const x = (i: number) => M.left + (i / (base.length - 1)) * (W - M.left - M.right);
  const y = (v: number) => M.top + (1 - v / top) * (H - M.top - M.bottom);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const hourly = base.map((p, i) => ({ p, i })).filter(({ i }) => i % 4 === 0);

  const path = (s: Scenario) =>
    (results[String(s)]?.series ?? []).map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.empty_stations_target).toFixed(1)}`).join(" ");

  return (
    <figure className="px-5 pb-2">
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold" aria-label="Leyenda">
        {SCENARIOS.map((s) => (
          <li key={s} className={cn("flex items-center gap-1.5", s === selected ? "text-ink" : "text-ink-muted")}>
            <svg aria-hidden width="18" height="6" className={LINE[s]}>
              <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth={s === selected ? 4 : 2} strokeLinecap="round" />
            </svg>
            {s === 0 ? "Sin Equilibici (0 %)" : `${s} %`}
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Estaciones vacías en Buenavista y San Rafael cada 15 minutos, de 7:00 a 10:00 hora CDMX, para 0, 5, 10 y 20 por ciento de adopción. Los mismos datos están en la tabla de comparación."
        className="w-full rounded-2xl bg-surface"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray="4 6" />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-muted text-[11px]">
              {t}
            </text>
          </g>
        ))}
        {hourly.map(({ p, i }) => (
          <text key={p.ts} x={x(i)} y={H - 8} textAnchor={i === base.length - 1 ? "end" : "middle"} className="fill-ink-muted text-[11px]">
            {cdmxTime(p.ts)}
          </text>
        ))}
        {SCENARIOS.filter((s) => s !== selected).map((s) => (
          <path key={s} d={path(s)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={cn(LINE[s], "opacity-70")} />
        ))}
        <path d={path(selected)} fill="none" stroke="currentColor" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" className={LINE[selected]} />
      </svg>
      <figcaption className="mt-2 text-xs text-ink-muted">
        Eje X: hora (7:00–10:00, CDMX), cada 15 min · Eje Y: estaciones sin bicis en Buenavista y San Rafael.
      </figcaption>
      <table className="sr-only">
        <caption>Estaciones vacías en Buenavista y San Rafael por hora y escenario</caption>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            {SCENARIOS.map((s) => (
              <th key={s} scope="col">{s} %</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {base.map((p, i) => (
            <tr key={p.ts}>
              <th scope="row">{cdmxTime(p.ts)}</th>
              {SCENARIOS.map((s) => (
                <td key={s}>{results[String(s)]?.series[i]?.empty_stations_target}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
