"use client";

import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { cdmxTime, num } from "@/features/bici-util/format";
import { KpiCard } from "@/features/panel/kpi-card";
import { Bike, Database, PackageSearch, Scale, Wrench } from "lucide-react";
import { useState } from "react";
import { useTaller } from "./data";

const PAGE = 15;

/** /panel/taller · qué estaciones visitar primero para retirar bicis que probablemente no sirven. */
export function TallerView() {
  const { data, source, loading } = useTaller();
  const [limit, setLimit] = useState(PAGE);
  const v = data.validation;
  const pct = (x: number) => `${(x * 100).toFixed(1).replace(/\.0$/, "")}%`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Taller</h1>
        <p className="max-w-3xl text-ink-muted">
          A qué estaciones ir primero para revisar bicis que llevan rato ancladas sin que nadie las tome. Es una pista para ordenar
          las visitas, no un diagnóstico: hay que confirmar con la bici en mano.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          {source === "respaldo" ? <DemoBadge /> : null}
          <Badge tone={data.mode === "REAL" ? "brand" : "warn"}>
            <Database aria-hidden className="size-3" />
            {data.mode === "REAL" ? "Dato real" : data.mode}
          </Badge>
          <span>
            Foto del <strong className="font-semibold text-ink">{cdmxTime(data.ts)}</strong> (hora CDMX)
            {source === "grabado" ? " · grabada del historial público" : null}
            {source === "respaldo" ? " · la API no respondió, se muestra la última foto grabada" : null}
          </span>
        </div>
      </div>

      <section aria-label="Resumen" aria-busy={loading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Estaciones con bicis sospechosas" value={num(data.totals.stations)} unit="estaciones" source="Prioridad de taller" icon={Wrench} />
        <KpiCard label="Bicis que podrían no servir" value={num(data.totals.suspected)} unit="bicis" source="Prioridad de taller" icon={Bike} />
        <KpiCard
          label="Las bicis marcadas desaparecen más seguido"
          value={v ? `${v.ratio.toLocaleString("es-MX")}×` : null}
          unit={v ? "más que las demás" : undefined}
          source={v ? `validación en sep (${pct(v.ignored_rate)} de las marcadas vs. ${pct(v.others_rate)} de las demás)` : "validación en sep"}
          icon={Scale}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] [&>*]:min-w-0">
        <Card className="overflow-hidden">
          <CardHeader
            title="Estaciones para visitar, de mayor a menor prioridad"
            description="Prioridad = bicis sospechosas × salidas en hora pico. Mientras más sale gente de ahí, más urgente."
          />
          <div tabIndex={0} role="region" aria-label="Tabla de prioridad" className="overflow-auto px-5 pb-5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
            <table className="w-full min-w-[460px] text-sm">
              <caption className="sr-only">Estaciones ordenadas por prioridad de taller</caption>
              <thead>
                <tr className="text-left text-xs whitespace-nowrap text-ink-muted">
                  <th scope="col" className="py-2 pr-2 font-semibold">#</th>
                  <th scope="col" className="py-2 font-semibold">Estación</th>
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">Bicis sospechosas</th>
                  <th scope="col" className="py-2 pl-3 font-semibold">Prioridad (0 a 100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.priority.slice(0, limit).map((p, i) => (
                  <tr key={p.station_id}>
                    <td className="py-2.5 pr-2 text-ink-muted tabular-nums">{i + 1}</td>
                    <th scope="row" className="py-2.5 text-left font-medium">
                      {p.name}
                      <span className="block text-xs font-normal text-ink-muted">
                        Estación {p.station_id}
                        {p.top_signals.length ? ` · ${p.top_signals.join(" · ")}` : ""}
                      </span>
                    </th>
                    <td className="py-2.5 pl-3 text-right font-semibold tabular-nums">{num(p.suspected_expected)}</td>
                    <td className="py-2.5 pl-3">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="h-2 w-20 overflow-hidden rounded-full bg-ink/10">
                          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, Math.round(p.priority_score * 100))}%` }} />
                        </span>
                        <span className="w-7 text-right text-xs font-semibold tabular-nums">{Math.round(p.priority_score * 100)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.priority.length > limit ? (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="mt-3 w-full rounded-full border border-line py-2 text-sm font-semibold text-ink-muted hover:bg-ink/5"
              >
                Mostrar {Math.min(PAGE, data.priority.length - limit)} más
              </button>
            ) : null}
          </div>
        </Card>

        <Card className="self-start overflow-hidden">
          <CardHeader
            title="Dónde dejan de aparecer más bicis"
            description="Bicis cuyo último arribo fue aquí y no han vuelto a salir en 3 semanas o más."
          />
          <div tabIndex={0} role="region" aria-label="Tabla de riesgo de pérdida" className="overflow-auto px-5 pb-3 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
            <table className="w-full text-sm">
              <caption className="sr-only">Estaciones y franjas con más bicis que dejaron de aparecer</caption>
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th scope="col" className="py-2 font-semibold">Estación</th>
                  <th scope="col" className="py-2 pl-3 font-semibold">Franja</th>
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">Bicis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.loss_risk.slice(0, 10).map((r) => (
                  <tr key={`${r.station_id}-${r.time_band}`}>
                    <th scope="row" className="py-2.5 text-left font-medium">{r.name}</th>
                    <td className="py-2.5 pl-3 text-xs whitespace-nowrap text-ink-muted">{r.time_band}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold tabular-nums">{r.disappeared_bikes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex gap-2 px-5 pb-5 text-xs text-ink-muted">
            <PackageSearch aria-hidden className="mt-0.5 size-4 shrink-0" />
            Es un riesgo, no un robo comprobado. Total en la lista: {num(data.loss_total)} bicis.
          </p>
        </Card>
      </div>

      {v ? <p className="max-w-3xl text-xs text-ink-muted">Cómo se validó: {v.definition}</p> : null}
    </div>
  );
}
