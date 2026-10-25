"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { useBiciUtil } from "@/features/bici-util/data";
import { DataNote } from "@/features/bici-util/data-note";
import { cdmxDate, cdmxTime, num, pct } from "@/features/bici-util/format";
import { StationsTable } from "@/features/bici-util/stations-table";
import { KpiCard } from "@/features/panel/kpi-card";
import { CalendarClock, CircleGauge, Timer } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

const UsefulMap = dynamic(() => import("@/features/bici-util/useful-map"), {
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

/**
 * Resumen del panel con los datos de la Línea 1 (C1 y contrato): mismos indicadores y misma foto que
 * /panel/supervision y /panel/bici-util. `aside` es la columna derecha (módulos del equipo).
 */
export function OverviewView({ aside }: { aside: ReactNode }) {
  const { data, source, loading } = useBiciUtil();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const k = data.contract;
  // Fracciones 0–1: se pasan a porcentaje una sola vez, con pct(). 0 es dato; null es "sin datos".
  const ratio = k.useful_peak_vs_5am.ratio_peak_min_vs_5;
  const empty = k.pct_time_empty.value;
  const over = data.clock.ts === null ? null : data.clock.stations_over_limit;
  const windowText = `ventana ${cdmxDate(k.window.from)} – ${cdmxDate(k.window.to)}`;
  const photoText = `foto de ${cdmxTime(data.clock.ts)}`;

  return (
    <>
      <DataNote data={data} source={source} />

      <section aria-label="Indicadores del contrato" aria-busy={loading} className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Bici útil en hora pico"
          value={ratio === null ? null : pct(ratio, 0)}
          unit={ratio === null ? undefined : "de la bici útil de las 5:00"}
          target="comparar contra el indicador de las 5:00"
          source={`Línea 1 · ${windowText}`}
          icon={CircleGauge}
        />
        <KpiCard
          label="Tiempo con estaciones vacías"
          value={empty === null ? null : pct(empty)}
          target={`máximo ${pct(k.pct_time_empty.limit, 0)}`}
          source={`Línea 1 · ${windowText}`}
          icon={Timer}
        />
        <KpiCard
          label="Estaciones fuera de plazo de 36 h"
          value={over === null ? null : num(over)}
          target="0"
          source={`Línea 1 · ${photoText}`}
          icon={CalendarClock}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Card className="overflow-hidden">
          <CardHeader
            title="Mapa del corredor"
            description={`Bici útil por estación en la ${photoText} (hora CDMX). La tabla de abajo tiene la misma información.`}
          />
          <div className="h-[360px] lg:h-[440px]">
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
        {aside}
      </div>

      <Card className="flex max-h-[560px] flex-col">
        <CardHeader title="Estaciones" description="La misma información del mapa, de peor a mejor." />
        <div className="min-h-0 flex-1">
          <StationsTable stations={data.stations} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </Card>
    </>
  );
}
