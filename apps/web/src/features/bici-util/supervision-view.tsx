"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button";
import { CalendarClock, CircleGauge, FileText, Timer } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useBiciUtil } from "./data";
import { DataNote } from "./data-note";
import { cdmxDate, cdmxTime, num, pct } from "./format";
import type { HourPoint } from "./types";

/** /panel/supervision · U4 + U5: los tres indicadores del contrato para Semovi. */
export function SupervisionView() {
  const { data, source, loading } = useBiciUtil();
  const k = data.contract;
  const peak = Object.values(k.useful_peak_vs_5am.useful_at_peak);
  const peakMin = peak.length ? Math.min(...peak) : null;
  const ratio = k.useful_peak_vs_5am.ratio_peak_min_vs_5;
  const empty = k.pct_time_empty;
  const clock = data.clock;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Supervisión del contrato</h1>
          <Link href="/panel/supervision/reporte" className={buttonClasses("dark", "sm")}>
            <FileText aria-hidden className="mr-1.5 size-4" /> Reporte para Semovi
          </Link>
        </div>
        <p className="max-w-3xl text-ink-muted">
          Tres indicadores medidos con datos públicos, independientes del reporte del operador. Ventana: {cdmxDate(k.window.from)} a{" "}
          {cdmxDate(k.window.to)}.
        </p>
        <DataNote data={data} source={source} />
      </div>

      <section aria-label="Indicadores del contrato" aria-busy={loading} className="grid gap-4 lg:grid-cols-3">
        <Indicator
          icon={CircleGauge}
          title="Bici útil en hora pico contra las 5:00"
          value={ratio === null ? "—" : pct(ratio, 0)}
          verdict={ratio === null ? null : ratio >= 0.9 ? "ok" : "fail"}
          verdictText={ratio === null ? "" : `En la hora pico queda ${pct(ratio, 0)} de la bici útil de las 5:00`}
          detail={`5:00: ${num(k.useful_peak_vs_5am.useful_at_5)} bicis útiles · peor hora pico: ${num(peakMin)}. El indicador oficial se mide a las 5:00, cuando el sistema está más lleno.`}
        />
        <Indicator
          icon={Timer}
          title="Tiempo con estaciones vacías"
          value={pct(empty.value)}
          verdict={empty.value === null ? null : empty.meets ? "ok" : "fail"}
          verdictText={empty.meets ? `Dentro del máximo de ${pct(empty.limit, 0)}` : `Rebasa el máximo de ${pct(empty.limit, 0)}`}
          detail={`En hora pico (8 y 18 h): ${pct(empty.value_peak)}. Fotos de estaciones abiertas entre 5:00 y 0:30.`}
        />
        <Indicator
          icon={CalendarClock}
          title="Estaciones fuera del plazo de 36 h"
          value={num(clock.stations_over_limit)}
          verdict={clock.stations_over_limit === 0 ? "ok" : "fail"}
          verdictText={`${num(clock.stations_over_limit)} estaciones llevan más de 36 h con bicis deshabilitadas`}
          detail={`En toda la ventana: ${num(k.stations_over_36h.episodes_in_window)} episodios en ${num(k.stations_over_36h.stations_with_episode)} estaciones.`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Estaciones vacías por hora" description="Promedio en días hábiles contra el máximo de 6%." />
          <div className="px-5 pb-5">
            <EmptyByHour hours={data.hourly} limit={empty.limit} />
          </div>
        </Card>

        <Card className="flex max-h-[560px] flex-col">
          <CardHeader
            title="Reloj de 36 h"
            description={`Estaciones fuera de plazo en la foto de ${cdmxTime(clock.ts)}. Ordenadas por horas acumuladas. Un hueco de más de 6 h en el feed reinicia la cuenta.`}
          />
          {clock.over_limit.length === 0 ? (
            <StateMessage kind="empty" title="Ninguna estación fuera de plazo en esta foto" />
          ) : (
            <div tabIndex={0} role="region" aria-label="Tabla del reloj de 36 h" className="relative min-h-0 flex-1 overflow-auto px-5 pb-5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">Estaciones con bicis deshabilitadas por más de 36 horas</caption>
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left text-xs whitespace-nowrap text-ink-muted">
                    <th scope="col" className="py-2 font-semibold">Estación</th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">Horas</th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">Deshabilitadas</th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">Desde (al menos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clock.over_limit.map((r) => (
                    <tr key={r.station_id}>
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium">{r.name}</th>
                      <td className="py-2.5 pl-3 text-right font-bold whitespace-nowrap text-danger-700 tabular-nums">{Math.round(r.hours)} h</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">{r.bikes_disabled}</td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap text-ink-muted">{cdmxTime(r.since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 text-sm text-ink-muted">
        <h2 className="mb-2 text-base font-semibold text-ink">Cómo se mide</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Bici útil = bicis disponibles menos las sospechosas de estar dañadas (Línea 2). Las deshabilitadas ya no cuentan como disponibles.</li>
          <li>Una estación cerrada no cuenta en ningún indicador y sus bicis no se cuentan como deshabilitadas.</li>
          <li>El reloj cuenta horas seguidas con al menos una bici deshabilitada en una estación abierta. El feed da conteos, no bicis individuales.</li>
          <li>Plazo de 36 h: bases de licitación 2026 (págs. 165–181). Máximo de 6% de tiempo vacía: contrato. Pendiente revisar el contrato firmado CT-049-2026.</li>
          <li>Fuente: historial público del feed GBFS de Ecobici (MaxHalford/bike-sharing-history), una foto cada ~12 min, guardada en UTC.</li>
        </ul>
      </Card>
    </div>
  );
}

function Indicator({
  icon: Icon,
  title,
  value,
  verdict,
  verdictText,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  verdict: "ok" | "fail" | null;
  verdictText: string;
  detail: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-muted">{title}</h2>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          <Icon aria-hidden className="size-5" />
        </span>
      </div>
      <p className="text-4xl font-bold tracking-tight tabular-nums">{value}</p>
      {verdict ? (
        <Badge tone={verdict === "ok" ? "brand" : "danger"} className="self-start normal-case">
          {verdict === "ok" ? "Cumple" : "No cumple"} · {verdictText}
        </Badge>
      ) : null}
      <p className="mt-auto border-t border-line pt-3 text-xs text-ink-muted">{detail}</p>
    </Card>
  );
}

function EmptyByHour({ hours, limit }: { hours: HourPoint[]; limit: number }) {
  const data = hours.filter((h) => h.hour >= 5);
  const max = Math.max(...data.map((h) => h.pct_stations_empty), limit) * 1.1;
  return (
    <div>
      <ul className="space-y-1" aria-label="Porcentaje de estaciones vacías por hora">
        {data.map((h) => {
          const over = h.pct_stations_empty > limit;
          return (
            <li key={h.hour} className="flex items-center gap-2 text-xs">
              <span className="w-10 shrink-0 text-right text-ink-muted tabular-nums">{h.hour}:00</span>
              <span className="relative h-3.5 flex-1 rounded-full bg-surface">
                <span
                  aria-hidden
                  className={cn("absolute inset-y-0 left-0 rounded-full", over ? "bg-danger-500" : "bg-brand-500")}
                  style={{ width: `${(h.pct_stations_empty / max) * 100}%` }}
                />
                <span aria-hidden className="absolute inset-y-[-3px] w-0.5 bg-ink" style={{ left: `${(limit / max) * 100}%` }} />
              </span>
              <span className={cn("w-12 shrink-0 text-right font-semibold tabular-nums", over && "text-danger-700")}>
                {pct(h.pct_stations_empty)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">La línea negra marca el máximo de {pct(limit, 0)}.</p>
    </div>
  );
}
