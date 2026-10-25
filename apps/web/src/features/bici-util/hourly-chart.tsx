import { num, pct } from "./format";
import type { HourPoint } from "./types";

/**
 * Barras por hora CDMX (5:00–23:00, días hábiles): bicis útiles y deshabilitadas ancladas.
 * Gráfica decorativa para quien ve; la tabla de abajo es la versión para lector de pantalla.
 */
export function HourlyChart({ hours }: { hours: HourPoint[] }) {
  const data = hours.filter((h) => h.hour >= 5);
  const max = Math.max(...data.map((h) => h.useful_bikes + h.bikes_disabled), 1);
  const W = 640;
  const H = 200;
  const bw = W / data.length;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-auto w-full" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={H - f * H} y2={H - f * H} className="stroke-line" strokeDasharray="4 6" />
        ))}
        {data.map((h, i) => {
          const u = (h.useful_bikes / max) * H;
          const d = (h.bikes_disabled / max) * H;
          const x = i * bw + bw * 0.15;
          const peak = h.hour === 8 || h.hour === 18;
          return (
            <g key={h.hour}>
              <rect x={x} y={H - u} width={bw * 0.7} height={u} rx={3} className={peak ? "fill-brand-900" : "fill-brand-500"} />
              <rect x={x} y={H - u - d} width={bw * 0.7} height={d} rx={3} className="fill-danger-500/70" />
              <text x={x + bw * 0.35} y={H + 16} textAnchor="middle" className="fill-ink-muted text-[11px]">
                {h.hour}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-500" /> Bicis útiles</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-900" /> Útiles en hora pico (8 y 18 h)</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-danger-500/70" /> Deshabilitadas ancladas</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-600">Ver como tabla</summary>
        <div className="relative mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <caption className="sr-only">Bicis útiles y deshabilitadas por hora, promedio de días hábiles</caption>
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th scope="col" className="py-1.5">Hora</th>
                <th scope="col" className="py-1.5 text-right">Útiles</th>
                <th scope="col" className="py-1.5 text-right">Deshabilitadas</th>
                <th scope="col" className="py-1.5 text-right">Estaciones vacías</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((h) => (
                <tr key={h.hour}>
                  <th scope="row" className="py-1.5 text-left font-medium">{h.hour}:00</th>
                  <td className="py-1.5 text-right tabular-nums">{num(h.useful_bikes)}</td>
                  <td className="py-1.5 text-right tabular-nums">{num(h.bikes_disabled)}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(h.pct_stations_empty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
