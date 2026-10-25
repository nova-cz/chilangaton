"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { KpiCard } from "@/features/panel/kpi-card";
import { Bike, PackageSearch, Wrench } from "lucide-react";
import { useTaller } from "./data";
import { DataNote } from "./data-note";
import { num, pct, priorityLevel, signalHelp, stationLabel } from "./format";
import type { LossRisk, Priority, TallerData } from "./types";

const TOP = 10;

/** /panel/taller · Línea 2: a qué estaciones mandar al taller primero y qué bicis dejan de aparecer. */
export function TallerView() {
  const { data, source, loading } = useTaller();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Taller</h1>
        <p className="max-w-3xl text-ink-muted">
          Dónde conviene mandar primero al equipo de taller. Se detectan bicis que llevan poco tiempo ancladas y nadie
          toma, aunque de su estación salen muchas otras. Es una señal para revisar, no un diagnóstico.
        </p>
        <DataNote data={data} source={source} />
      </div>

      <section aria-label="Resumen" aria-busy={loading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Bicis con falla probable"
          value={num(data.totals.suspected)}
          unit="bicis"
          source="C2 · Línea 2"
          icon={Bike}
        />
        <KpiCard
          label="Estaciones con alguna señal"
          value={num(data.totals.stations_flagged)}
          source="C2 · Línea 2"
          icon={Wrench}
        />
        <KpiCard
          label="Bicis que dejan de aparecer"
          value={num(data.totals.lost_bikes)}
          unit="bicis"
          target="riesgo, no robo comprobado"
          source="C6 · Línea 2"
          icon={PackageSearch}
        />
        <KpiCard
          label="Señal frente al resto de bicis"
          value={data.validation ? `${data.validation.ratio.toLocaleString("es-MX")}×` : null}
          target="más probable que dejen de aparecer"
          source="Validación · Línea 2"
          icon={Bike}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
        <PriorityList rows={data.priority.slice(0, TOP)} names={data.names} />
        <div className="space-y-6">
          <LossList rows={data.lossRisk.slice(0, TOP)} names={data.names} total={data.totals.lost_bikes} />
          <ValidationCard validation={data.validation} />
        </div>
      </div>
    </div>
  );
}

function PriorityList({ rows, names }: { rows: Priority[]; names: TallerData["names"] }) {
  return (
    <Card>
      <CardHeader
        title={`Las ${TOP} estaciones para atender primero`}
        description="Prioridad = bicis con falla probable × salidas en horas pico. 100% es la estación más urgente."
      />
      {rows.length === 0 ? (
        <StateMessage kind="empty" title="Sin estaciones con señal" description="No hay datos para esta hora." />
      ) : (
        <ol className="divide-y divide-line">
          {rows.map((row, i) => {
            const { code, name } = stationLabel(row, names);
            const level = priorityLevel(row.priority_score);
            return (
              <li key={`${row.station_id}-${i}`} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-ink-muted">Código CE {code}</p>
                    </div>
                  </div>
                  <Badge tone={level.tone}>{level.label}</Badge>
                </div>
                <dl className="grid grid-cols-3 gap-3 pl-10 text-sm">
                  <div>
                    <dt className="text-xs text-ink-muted">Bicis con falla probable</dt>
                    <dd className="font-semibold tabular-nums">{num(row.suspected_expected)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Salidas en pico por día</dt>
                    <dd className="font-semibold tabular-nums">{num(row.peak_departures)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Urgencia</dt>
                    <dd className="font-semibold tabular-nums">{pct(row.priority_score, 0)}</dd>
                  </div>
                </dl>
                <ul className="flex flex-wrap gap-1.5 pl-10" aria-label="Por qué aparece aquí">
                  {row.top_signals.map((s) => (
                    <li key={s}>
                      <Badge tone="neutral" className="normal-case tracking-normal">
                        {s}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="pl-10 text-xs text-ink-muted">{row.top_signals.map(signalHelp).join(" ")}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function LossList({ rows, names, total }: { rows: LossRisk[]; names: TallerData["names"]; total: number }) {
  return (
    <Card>
      <CardHeader
        title="Bicis que dejan de aparecer"
        description={`${num(total)} bicis llegaron a una estación y no volvieron a salir en 3 semanas o más. Aquí van las ${rows.length} estaciones con más casos.`}
      />
      <p className="mx-5 mb-3 rounded-2xl bg-warning-100 px-4 py-2 text-xs font-semibold text-warning-700">
        Es riesgo, no robo comprobado: también hay bicis que se retiran al taller sin aviso público.
      </p>
      {rows.length === 0 ? (
        <StateMessage kind="empty" title="Sin casos" description="No hay bicis desaparecidas para esta hora." />
      ) : (
        <ul className="divide-y divide-line pb-2">
          {rows.map((row, i) => {
            const { code, name } = stationLabel(row, names);
            return (
              <li key={`${row.station_id}-${row.time_band}-${i}`} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-xs text-ink-muted">
                    CE {code} · último arribo de {row.time_band} h
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{num(row.disappeared_bikes)} bicis</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ValidationCard({ validation: v }: { validation: TallerData["validation"] }) {
  return (
    <Card>
      <CardHeader title="¿La señal sirve?" description="Se probó con 18 mañanas de septiembre de 2026." />
      {v ? (
        <div className="space-y-3 px-5 pb-5 text-sm">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-brand-50 p-3">
              <dt className="text-xs text-ink-muted">Bicis señaladas que desaparecen</dt>
              <dd className="text-xl font-bold tabular-nums">{pct(v.ignored.rate)}</dd>
              <dd className="text-xs text-ink-muted">{num(v.ignored.gone_72h)} de {num(v.ignored.bikes)}</dd>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <dt className="text-xs text-ink-muted">Resto de las bicis</dt>
              <dd className="text-xl font-bold tabular-nums">{pct(v.others.rate)}</dd>
              <dd className="text-xs text-ink-muted">{num(v.others.gone_72h)} de {num(v.others.bikes)}</dd>
            </div>
          </dl>
          <p className="text-ink-muted">{v.definition}</p>
        </div>
      ) : (
        <StateMessage kind="empty" title="Sin validación todavía" description="Falta exportar el historial de viajes." />
      )}
    </Card>
  );
}
