"use client";

import { Button, buttonClasses } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useBiciUtil, useCasesCount } from "./data";
import { cdmxDate, cdmxTime, num, pct } from "./format";

/**
 * Al imprimir solo se ve el reporte (no la barra lateral ni el encabezado del panel).
 * Se hace con visibilidad para no tocar el layout compartido del panel.
 */
const PRINT_CSS = `
@media print {
  @page { size: letter; margin: 14mm; }
  body * { visibility: hidden !important; }
  #reporte-semovi, #reporte-semovi * { visibility: visible !important; }
  #reporte-semovi { position: absolute; inset: 0 auto auto 0; width: 100%; }
  .no-print { display: none !important; }
}`;

/** U7 · Reporte para Semovi: los 3 indicadores, el reloj de 36 h, casos de Regreso Seguro y método. */
export function ReportView() {
  const { data, source } = useBiciUtil();
  const cases = useCasesCount();
  const k = data.contract;
  const empty = k.pct_time_empty;
  const peak = Object.values(k.useful_peak_vs_5am.useful_at_peak);
  const peakMin = peak.length ? Math.min(...peak) : null;
  const names = useMemo(() => new Map(data.stations.map((s) => [s.station_id, s.name])), [data.stations]);
  const caseTotals = cases && {
    open: cases.stations.reduce((a, s) => a + s.open_cases, 0),
    reincorporated: cases.stations.reduce((a, s) => a + s.reincorporated, 0),
  };

  const rows = [
    {
      name: "Bici útil en hora pico contra las 5:00",
      value: pct(k.useful_peak_vs_5am.ratio_peak_min_vs_5, 0),
      target: "Mismo nivel que a las 5:00",
      meets: (k.useful_peak_vs_5am.ratio_peak_min_vs_5 ?? 0) >= 0.9,
      detail: `${num(k.useful_peak_vs_5am.useful_at_5)} útiles a las 5:00; ${num(peakMin)} en la peor hora pico`,
    },
    {
      name: "Tiempo con estaciones vacías",
      value: pct(empty.value),
      target: `Máximo ${pct(empty.limit, 0)}`,
      meets: empty.meets,
      detail: `${pct(empty.value_peak)} a las 8 y 18 h`,
    },
    {
      name: "Estaciones fuera del plazo de 36 h",
      value: num(data.clock.stations_over_limit),
      target: "0",
      meets: data.clock.stations_over_limit === 0,
      detail: `${num(k.stations_over_36h.episodes_in_window)} episodios en ${num(k.stations_over_36h.stations_with_episode)} estaciones en la ventana`,
    },
  ];

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/supervision" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft aria-hidden className="mr-1 size-4" /> Volver a Supervisión
        </Link>
        <Button variant="dark" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden className="mr-1.5 size-4" /> Imprimir o guardar PDF
        </Button>
      </div>

      <article id="reporte-semovi" className="mx-auto max-w-3xl space-y-6 rounded-[var(--radius-card)] border border-line bg-card p-6 text-sm leading-relaxed text-ink sm:p-10 print:border-0 print:p-0">
        <header className="border-b border-line pb-4">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Equilibici · Reporte para Semovi</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Supervisión del servicio Ecobici</h1>
          <p className="mt-1 text-ink-muted">
            Ventana {cdmxDate(k.window.from)} – {cdmxDate(k.window.to)} · foto del feed {cdmxTime(data.clock.ts)} (hora CDMX) ·
            datos {data.mode === "REAL" ? "públicos reales" : data.mode}
            {source === "respaldo" ? " · la API no respondió: última foto grabada" : ""}
          </p>
        </header>

        <section aria-labelledby="r-ind">
          <h2 id="r-ind" className="mb-2 text-base font-semibold">1. Indicadores del contrato</h2>
          <table className="w-full">
            <caption className="sr-only">Indicadores del contrato, valor medido y meta</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th scope="col" className="py-1.5">Indicador</th>
                <th scope="col" className="py-1.5 text-right">Medido</th>
                <th scope="col" className="py-1.5 pl-3">Meta</th>
                <th scope="col" className="py-1.5 pl-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.name} className="align-top">
                  <th scope="row" className="py-2 text-left font-medium">
                    {r.name}
                    <span className="block text-xs font-normal text-ink-muted">{r.detail}</span>
                  </th>
                  <td className="py-2 text-right font-bold tabular-nums">{r.value}</td>
                  <td className="py-2 pl-3">{r.target}</td>
                  <td className={r.meets ? "py-2 pl-3 font-semibold text-brand-600" : "py-2 pl-3 font-semibold text-danger-700"}>
                    {r.meets ? "Cumple" : "No cumple"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="r-clock">
          <h2 id="r-clock" className="mb-2 text-base font-semibold">2. Estaciones fuera del plazo de 36 h</h2>
          {data.clock.over_limit.length === 0 ? (
            <p>Ninguna estación fuera de plazo en esta foto.</p>
          ) : (
            <table className="w-full">
              <caption className="sr-only">Estaciones con bicis deshabilitadas por más de 36 horas</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th scope="col" className="py-1.5">Estación</th>
                  <th scope="col" className="py-1.5 text-right">Horas</th>
                  <th scope="col" className="py-1.5 pl-3 text-right">Deshabilitadas</th>
                  <th scope="col" className="py-1.5 pl-3 text-right">Desde (al menos)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.clock.over_limit.map((r) => (
                  <tr key={r.station_id} className="break-inside-avoid">
                    <th scope="row" className="py-1.5 text-left font-medium">{r.name}</th>
                    <td className="py-1.5 text-right font-semibold whitespace-nowrap tabular-nums">{Math.round(r.hours)} h</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{r.bikes_disabled}</td>
                    <td className="py-1.5 pl-3 text-right whitespace-nowrap">{cdmxTime(r.since)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="r-cases" className="break-inside-avoid">
          <h2 id="r-cases" className="mb-2 text-base font-semibold">3. Casos de Regreso Seguro</h2>
          {cases === null ? (
            <p className="text-ink-muted">Sin datos todavía: los casos los publica la Línea 5 (contrato C5) y se agregan aquí cuando su módulo está conectado.</p>
          ) : cases.stations.length === 0 ? (
            <p>Sin casos registrados al {cdmxTime(cases.generatedAt)}.</p>
          ) : (
            <>
              <p className="mb-2">
                {num(caseTotals?.open)} casos abiertos y {num(caseTotals?.reincorporated)} bicis reincorporadas al {cdmxTime(cases.generatedAt)}.
                La ubicación precisa no se publica.
              </p>
              <table className="w-full">
                <caption className="sr-only">Casos por estación</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th scope="col" className="py-1.5">Estación</th>
                    <th scope="col" className="py-1.5 text-right">Abiertos</th>
                    <th scope="col" className="py-1.5 pl-3 text-right">Reincorporadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {cases.stations.map((s) => (
                    <tr key={s.station_id}>
                      <th scope="row" className="py-1.5 text-left font-medium">{names.get(s.station_id) ?? s.station_id}</th>
                      <td className="py-1.5 text-right tabular-nums">{s.open_cases}</td>
                      <td className="py-1.5 pl-3 text-right tabular-nums">{s.reincorporated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section aria-labelledby="r-method" className="break-inside-avoid">
          <h2 id="r-method" className="mb-2 text-base font-semibold">4. Método y fuentes</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            <li>Bici útil = disponibles menos sospechosas de estar dañadas (Línea 2){data.c2_mode !== "REAL" ? "; en este reporte las sospechosas aún no se descuentan" : ""}.</li>
            <li>Estaciones cerradas no cuentan; de 0:30 a 5:00 no hay servicio.</li>
            <li>El reloj cuenta horas seguidas con al menos una bici deshabilitada en una estación abierta; el feed da conteos, no bicis individuales.</li>
            <li>Plazo de 36 h: bases de licitación 2026, págs. 165–181. Máximo de 6% de tiempo vacía: contrato. Pendiente revisar el contrato firmado CT-049-2026.</li>
            <li>Fuente: historial público del feed GBFS de Ecobici (MaxHalford/bike-sharing-history), una foto cada ~12 min, en UTC.</li>
            <li>Una bici deshabilitada no es un diagnóstico; toda discrepancia pasa por revisión humana.</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
