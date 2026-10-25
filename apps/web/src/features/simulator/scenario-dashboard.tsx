"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { SimulatedBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";
import { CHART_COLORS } from "./chart-palette";
import { nf, nf0 } from "./format";
import { SCENARIOS, type Scenario } from "./scenarios";
import type { ScenarioResult } from "./types";

const MetricScene = dynamic(() => import("./metric-scene"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/65">Preparando gráfica…</div> });

export function ScenarioDashboard({ results, selected, onSelect, targetHours, scaleMaximums }: {
  results: Record<string, ScenarioResult>;
  selected: Scenario;
  onSelect: (scenario: Scenario) => void;
  targetHours?: number;
  scaleMaximums?: { hours: number; bikes: number };
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const [flat, setFlat] = useState(false);
  const [failed, setFailed] = useState(false);
  const [metric, setMetric] = useState<"empty_station_hours_target" | "bikes_moved">("empty_station_hours_target");
  const unavailable = useCallback(() => setFailed(true), []);
  const selectBar = useCallback((index: number) => { const scenario = SCENARIOS[index]; if (scenario !== undefined) onSelect(scenario); }, [onSelect]);
  const values = useMemo(() => SCENARIOS.map((s) => results[String(s)]?.totals[metric] ?? 0), [results, metric]);
  const picked = results[String(selected)];
  const base = results["0"];
  if (!picked || !base) return null;
  const empty = picked.totals.empty_station_hours_target;
  const saved = base.totals.empty_station_hours_target - empty;
  const change = base.totals.empty_station_hours_target > 0 ? (saved / base.totals.empty_station_hours_target) * 100 : 0;
  const serviceRatio = targetHours && targetHours > 0 ? Math.max(0, Math.min(1, 1 - empty / targetHours)) : undefined;
  const useFlat = reduced || flat || failed;
  const hours = metric === "empty_station_hours_target";
  const maximum = (hours ? scaleMaximums?.hours : scaleMaximums?.bikes) ?? Math.max(1, ...values);

  return (
    <section aria-label="Comparación visual de escenarios" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[#14291f] p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-lime-300 uppercase">La misma mañana, cuatro escenarios</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{hours ? "Horas con estaciones vacías" : "Bicis movidas por misiones"}</h2>
              <p className="mt-1 text-sm text-white/65">{hours ? "Buenavista + San Rafael · menos es mejor" : "Toda la red · movimientos adicionales simulados"}</p>
            </div>
            <SimulatedBadge />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-white/10 p-1" aria-label="Métrica de comparación">
              <button type="button" aria-pressed={hours} onClick={() => setMetric("empty_station_hours_target")} className={cn("min-h-9 rounded-full px-3 text-xs font-semibold", hours && "bg-lime-300 text-brand-900")}>Horas vacías</button>
              <button type="button" aria-pressed={!hours} onClick={() => setMetric("bikes_moved")} className={cn("min-h-9 rounded-full px-3 text-xs font-semibold", !hours && "bg-lime-300 text-brand-900")}>Bicis movidas</button>
            </div>
            <button type="button" disabled={reduced || failed} onClick={() => setFlat((v) => !v)} className="min-h-9 rounded-full px-3 text-xs font-semibold text-white/80 underline underline-offset-4 disabled:opacity-60">{useFlat ? "Ver barras 3D" : "Ver barras 2D"}</button>
          </div>
          <div className="relative mt-3 h-60 sm:h-72" role="img" aria-label={`${hours ? "Horas estación-vacía" : "Bicis movidas"} por adopción: ${SCENARIOS.map((s, i) => `${s} por ciento: ${values[i]}`).join("; ")}. Escala desde cero. Selección también disponible en los botones siguientes.`}>
            {useFlat ? (
              <div className="grid h-full grid-cols-4 items-end gap-6 border-b border-white/20 px-5 pt-6 sm:gap-10">
                {values.map((value, i) => <div key={SCENARIOS[i]} className="mx-auto w-full max-w-20 rounded-t-xl" style={{ height: `${(value / maximum) * 90}%`, backgroundColor: CHART_COLORS[i], opacity: SCENARIOS[i] === selected ? 1 : 0.65 }} />)}
              </div>
            ) : <MetricScene kind="bars" values={values} maximum={maximum} selected={SCENARIOS.indexOf(selected)} onSelect={selectBar} onUnavailable={unavailable} />}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2" aria-label="Elegir escenario en la gráfica">
            {SCENARIOS.map((s, i) => <button key={s} type="button" aria-label={`Seleccionar ${s}% de adopción`} aria-pressed={selected === s} onClick={() => onSelect(s)} className={cn("rounded-2xl px-1 py-3 text-center transition-colors", selected === s ? "bg-white/12 ring-1 ring-lime-300/70" : "hover:bg-white/5")}>
              <span className="block font-mono text-xl font-medium sm:text-2xl" style={{ color: CHART_COLORS[i] }}>{hours ? nf.format(values[i] ?? 0) : nf0.format(values[i] ?? 0)}<span className="ml-1 text-xs">{hours ? "h" : "bicis"}</span></span>
              <span className="mt-1 block text-xs text-white/70">{s}% adopción</span>
            </button>)}
          </div>
          <p className="mt-4 text-xs text-white/60">Escala de 0 a {nf.format(maximum)} {hours ? "h" : "bicis"}, compartida entre escenarios y estados de recuperación. {reduced ? "Vista 2D por tu preferencia de reducir movimiento." : failed ? "Vista 2D porque WebGL no está disponible." : "Selecciona una columna o su cifra para comparar."}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-lime-300 p-6 text-brand-900">
            <p className="text-xs font-semibold tracking-wider uppercase">Cambio frente a 0% de adopción</p>
            <p className="mt-3 font-mono text-5xl font-medium tracking-tighter">{saved > 0 ? "−" : saved < 0 ? "+" : ""}{nf.format(Math.abs(change))}<span className="ml-1 text-2xl">%</span></p>
            <p className="mt-2 text-sm font-medium">{nf.format(Math.abs(saved))} horas estación-vacía {saved >= 0 ? "menos" : "más"} con {selected}% de adopción.</p>
            <p className="mt-3 text-xs text-brand-900/70">Ambos escenarios usan el mismo estado de recuperación.</p>
          </div>
          <div className="flex-1 rounded-[2rem] bg-[#14291f] p-5 text-white">
            <p className="text-xs font-semibold tracking-wider text-white/70 uppercase">Tiempo con al menos una bici</p>
            <div className="relative mx-auto h-52 max-w-64">
              {serviceRatio === undefined ? null : useFlat ? <svg viewBox="0 0 200 200" aria-hidden className="h-full w-full -rotate-90"><circle cx="100" cy="100" r="77" fill="none" stroke="#a58bea" strokeWidth="13" /><circle cx="100" cy="100" r="77" fill="none" stroke="#cdee8a" strokeWidth="13" strokeDasharray={`${serviceRatio * 484} 484`} strokeLinecap="round" /></svg> : <MetricScene kind="ring" values={values} selected={0} ratio={serviceRatio} onUnavailable={unavailable} />}
              <div className="pointer-events-none absolute inset-0 grid content-center justify-items-center"><span className="font-mono text-4xl font-medium tracking-tight">{serviceRatio === undefined ? "—" : `${nf.format(serviceRatio * 100)}%`}</span><span className="mt-1 text-xs text-white/60">del tiempo estación</span></div>
            </div>
            <div className="flex justify-center gap-4 text-xs text-white/75"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-lime-300" />Con bici</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#a58bea]" />Vacía</span></div>
            <p className="mt-3 text-xs leading-relaxed text-white/60">Buenavista y San Rafael · {targetHours ? `${nf.format(targetHours)} horas estación posibles entre 7:00 y 10:00.` : "Base de tiempo no disponible."} Es una proporción simulada, no una probabilidad de llegada.</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Horas estación vacía", value: nf.format(empty), unit: "h", color: "bg-white" },
          { label: "Movimientos por misiones", value: nf0.format(picked.totals.bikes_moved), unit: "bicis", color: "bg-mist-100" },
          { label: "Viajes no servidos en el modelo", value: nf0.format(picked.totals.lost_trips), unit: "viajes", color: "bg-white" },
          { label: "Llegadas con desvío", value: nf0.format(picked.totals.diverted_arrivals), unit: "viajes", color: "bg-brand-100" },
        ].map((item) => <div key={item.label} className={cn("rounded-3xl p-4 sm:p-5", item.color)}><p className="text-xs font-medium text-ink-muted">{item.label}</p><p className="mt-3 font-mono text-3xl font-medium tracking-tight">{item.value}<span className="ml-1 text-xs font-sans font-medium text-ink-muted">{item.unit}</span></p></div>)}
      </div>
    </section>
  );
}
