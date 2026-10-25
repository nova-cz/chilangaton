"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { KpiCard } from "@/features/panel/kpi-card";
import { Bike, CalendarClock, CircleOff, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useBiciUtil } from "./data";
import { DataNote } from "./data-note";
import { num, overClock, pct, usefulState } from "./format";
import { HourlyChart } from "./hourly-chart";
import { StationsTable } from "./stations-table";
import type { BiciUtilStation } from "./types";

const UsefulMap = dynamic(() => import("./useful-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-surface">
      <StateMessage kind="loading" title="Cargando mapa…" />
    </div>
  ),
});

const LEGEND = [
  { color: "bg-brand-500", label: "Hay bici útil (4 o más)" },
  { color: "bg-warning-500", label: "Pocas (1 a 3)" },
  { color: "bg-danger-500", label: "Sin bici útil" },
  { color: "bg-ink-soft", label: "Cerrada" },
];

/** /panel/bici-util · U5. */
export function BiciUtilView() {
  const { data, source, loading } = useBiciUtil();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.stations.find((s) => s.station_id === selectedId) ?? null;

  const totals = useMemo(() => {
    const open = data.stations.filter((s) => s.is_renting);
    const avail = open.reduce((a, s) => a + s.bikes_available, 0);
    const disabled = open.reduce((a, s) => a + s.bikes_disabled, 0);
    return {
      useful: open.reduce((a, s) => a + s.useful_bikes, 0),
      empty: open.filter((s) => s.useful_bikes === 0).length,
      open: open.length,
      pctDisabled: avail + disabled ? disabled / (avail + disabled) : null,
      over: data.stations.filter((s) => overClock(s)).length,
    };
  }, [data.stations]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Bici útil</h1>
        <p className="max-w-3xl text-ink-muted">
          Cuántas bicis sirven de verdad en cada estación: las disponibles menos las que probablemente están dañadas.
          Las estaciones cerradas no cuentan.
        </p>
        <DataNote data={data} source={source} />
      </div>

      <section aria-label="Resumen de la foto" aria-busy={loading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Bicis útiles en estaciones abiertas" value={num(totals.useful)} unit="bicis" source="C1 · Línea 1" icon={Bike} />
        <KpiCard
          label="Estaciones abiertas sin bici útil"
          value={num(totals.empty)}
          unit={`de ${num(totals.open)}`}
          source="C1 · Línea 1"
          icon={CircleOff}
        />
        <KpiCard label="Ancladas deshabilitadas" value={pct(totals.pctDisabled)} target="retirarlas en menos de 36 h" source="Feed GBFS" icon={Wrench} />
        <KpiCard label="Estaciones fuera del plazo de 36 h" value={num(totals.over)} target="0" source="Reloj de 36 h" icon={CalendarClock} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
        <Card className="overflow-hidden">
          <CardHeader
            title="Mapa de bici útil"
            description="Contorno oscuro: más de 36 h con bicis deshabilitadas. Toca un punto o una fila de la tabla."
          />
          <div className="h-[380px] lg:h-[520px]">
            <UsefulMap stations={data.stations} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 text-xs text-ink-muted" aria-label="Leyenda del mapa">
            {LEGEND.map((l) => (
              <li key={l.label} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`size-2.5 rounded-full ${l.color}`} /> {l.label}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex max-h-[680px] flex-col">
          <CardHeader title="Estaciones" description="La misma información del mapa, de peor a mejor." />
          {selected ? <StationDetail station={selected} onClose={() => setSelectedId(null)} /> : null}
          <div className="min-h-0 flex-1">
            <StationsTable stations={data.stations} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Bici útil a lo largo del día"
          description="Promedio por hora en días hábiles (ago–sep 2026). De 0:30 a 5:00 el servicio está cerrado."
        />
        <div className="px-5 pb-5">
          <HourlyChart hours={data.hourly} />
        </div>
      </Card>
    </div>
  );
}

function StationDetail({ station: s, onClose }: { station: BiciUtilStation; onClose: () => void }) {
  const st = usefulState(s);
  return (
    <section aria-label={`Detalle de ${s.name}`} aria-live="polite" className="mx-5 mb-3 rounded-2xl bg-brand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{s.name}</p>
          <p className="text-xs text-ink-muted">
            Código CE {s.short_name ?? "—"} · ID del feed {s.station_id} · capacidad {s.capacity ?? "—"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-2 text-sm font-semibold text-brand-600 hover:underline">
          Cerrar
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-ink-muted">Estado</dt><dd className="font-semibold">{st.label}</dd></div>
        <div><dt className="text-xs text-ink-muted">Útiles / disponibles</dt><dd className="font-semibold tabular-nums">{s.useful_bikes} / {s.bikes_available}</dd></div>
        <div><dt className="text-xs text-ink-muted">Deshabilitadas</dt><dd className="font-semibold tabular-nums">{s.bikes_disabled}{s.disabled_hours ? ` · ${Math.round(s.disabled_hours)} h` : ""}</dd></div>
        <div><dt className="text-xs text-ink-muted">Vacía a esta hora</dt><dd className="font-semibold tabular-nums">{pct(s.pct_empty_hour, 0)} del tiempo</dd></div>
      </dl>
    </section>
  );
}
