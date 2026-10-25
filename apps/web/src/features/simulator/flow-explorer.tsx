"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useMediaQuery } from "@/lib/use-media-query";
import { FlowFlat } from "./flow-flat";
import { zoneFlows } from "./flow-data";
import { cdmxTime, nf } from "./format";
import type { ContraflujoResult, ScenarioResult } from "./types";

const FlowMap = dynamic(() => import("./flow-map"), { ssr: false, loading: () => <p className="p-6 text-sm">Cargando mapa 3D…</p> });

export function FlowExplorer({ contraflujo, result }: { contraflujo: ContraflujoResult; result: ScenarioResult }) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const [flat, setFlat] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const flows = useMemo(() => zoneFlows(contraflujo), [contraflujo]);
  const unavailable = useCallback(() => setFailed(true), []);
  const useFlat = reduced || flat || failed;
  const point = result.series[Math.min(frame, result.series.length - 1)];

  useEffect(() => {
    if (!playing || useFlat || result.series.length < 2) return;
    const timer = window.setInterval(() => setFrame((i) => (i + 1) % result.series.length), 1200);
    return () => window.clearInterval(timer);
  }, [playing, useFlat, result.series.length]);

  if (!flows.length || !point) return null;

  return (
    <Card>
      <CardHeader title="Contraflujo y disponibilidad" description="Arcos: promedio observado de septiembre. Círculo: estaciones vacías simuladas de Buenavista y San Rafael." action={<SimulatedBadge />} />
      <div className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{result.adoption_pct}% de adopción</Badge>
            <Badge tone="neutral">{point.empty_stations_target} estaciones vacías · {cdmxTime(point.ts)}</Badge>
          </div>
          <Button size="sm" variant="soft" disabled={reduced || failed} onClick={() => setFlat((v) => !v)}>{useFlat ? "Ver 3D" : "Ver 2D"}</Button>
        </div>
        {failed || reduced ? <p className="text-sm text-ink-muted" role="status">Vista 2D {reduced ? "para respetar tu preferencia de reducir movimiento" : "porque el mapa 3D no está disponible"}.</p> : null}
        <div className="h-80 overflow-hidden rounded-2xl border border-line">
          {useFlat ? <FlowFlat flows={flows} /> : <FlowMap flows={flows} empty={point.empty_stations_target} frame={frame} playing={playing} onUnavailable={unavailable} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="dark" disabled={useFlat} aria-pressed={playing && !useFlat} onClick={() => setPlaying((v) => !v)}>{playing && !useFlat ? "Pausar" : "Reproducir mañana"}</Button>
          <label htmlFor="flow-time" className="text-sm font-semibold">Hora CDMX · {cdmxTime(point.ts)}</label>
          <input id="flow-time" type="range" min={0} max={result.series.length - 1} step={1} value={frame} onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} aria-valuetext={`${cdmxTime(point.ts)}, ${point.empty_stations_target} estaciones vacías en Buenavista y San Rafael`} className="min-w-32 flex-1 accent-brand-600" />
        </div>
        <p className="text-xs text-ink-muted">Los arcos unen centros aproximados de zonas, no estaciones ni rutas. Su grosor representa viajes/día de 7:00 a 10:00; la animación es ilustrativa. El círculo y el contador cambian con la hora y el escenario seleccionados. Las dos zonas se muestran agregadas porque así las publica S3.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="pb-2 text-left text-xs font-semibold text-ink-muted">Equivalente del mapa · contraflujo observado, promedio por día hábil</caption>
            <thead><tr className="text-left"><th scope="col" className="py-2">Origen</th><th scope="col">Destino</th><th scope="col" className="text-right">Viajes/día</th></tr></thead>
            <tbody className="divide-y divide-line">{flows.map((flow) => <tr key={`${flow.from}-${flow.to}`}><th scope="row" className="py-2 text-left font-medium">{flow.from}</th><td>{flow.to}</td><td className="text-right tabular-nums">{nf.format(flow.trips)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
