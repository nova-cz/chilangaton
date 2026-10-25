"use client";

import { DemoBadge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { HORIZONS, type DemoStation, type Horizon } from "@/features/demo/types";
import { bikesStatus, docksStatus, OUTLOOK_COPY, TONE_DOT, TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { Bike, Clock3, ParkingSquare, X } from "lucide-react";
import { useState } from "react";

/** Tarjeta flotante de estación: bicis, anclajes y horizonte con estado de EJEMPLO. */
export function StationCard({ station, onClose }: { station: DemoStation; onClose: () => void }) {
  const [horizon, setHorizon] = useState<Horizon>(15);
  const bikes = bikesStatus(station.bikes_available);
  const docks = docksStatus(station.docks_available);
  const outlook = OUTLOOK_COPY[station.example_outlook[`${horizon}`]];
  const fill = Math.round((station.bikes_available / station.capacity) * 100);

  return (
    <article aria-labelledby={`station-${station.id}`} className="animate-sheet-in">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <DemoBadge />
            <span className="text-xs font-medium text-ink-muted">{station.zone}</span>
          </div>
          <h2 id={`station-${station.id}`} className="mt-1 text-lg font-bold tracking-tight lg:text-xl">
            {station.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar estación"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:mt-4 lg:gap-3">
        <Stat icon={<Bike aria-hidden className="size-5" />} value={station.bikes_available} label="Bicis" status={bikes} highlight />
        <Stat icon={<ParkingSquare aria-hidden className="size-5" />} value={station.docks_available} label="Anclajes libres" status={docks} />
      </div>

      <div className="mt-3" aria-hidden>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${fill}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">Capacidad: {station.capacity} anclajes</p>
      </div>

      <section className="mt-3 rounded-2xl bg-surface p-3 lg:mt-4 lg:p-3.5" aria-label="Estado de ejemplo por horizonte">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock3 aria-hidden className="size-4 text-brand-600" />
            Al llegar en
          </p>
          <Segmented
            size="sm"
            label="Horizonte"
            value={horizon}
            onChange={setHorizon}
            options={HORIZONS.map((h) => ({ value: h, label: `${h} min` }))}
          />
        </div>
        <p className={cn("mt-2.5 flex items-center gap-2 text-[15px] font-semibold", TONE_TEXT[outlook.tone])} aria-live="polite">
          <span aria-hidden className={cn("size-2.5 rounded-full", TONE_DOT[outlook.tone])} />
          {outlook.label}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Estado de ejemplo, no es un pronóstico. La probabilidad real llegará con el módulo de viaje (Línea 3).
        </p>
      </section>
    </article>
  );
}

function Stat({
  icon,
  value,
  label,
  status,
  highlight,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  status: { tone: keyof typeof TONE_TEXT; label: string };
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl p-3 lg:p-3.5", highlight ? "bg-brand-900 text-white" : "bg-brand-50 text-ink")}>
      <div className="flex items-center justify-between">
        <span className={highlight ? "text-brand-300" : "text-brand-600"}>{icon}</span>
        <span className="text-2xl font-bold tracking-tight tabular-nums lg:text-3xl">{value}</span>
      </div>
      <p className={cn("mt-1 text-sm font-medium", highlight ? "text-white/80" : "text-ink-muted")}>{label}</p>
      <p className={cn("text-xs font-semibold", highlight ? "text-brand-200" : TONE_TEXT[status.tone])}>{status.label}</p>
    </div>
  );
}
