"use client";

import { DemoBadge } from "@/components/ui/badge";
import { StateMessage } from "@/components/ui/state-message";
import { Metric } from "@/components/ui/ring";
import type { DemoStation } from "@/features/demo/types";
import { bikesStatus, TONE_DOT, TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { Bike, ChevronRight, ParkingSquare, Target } from "lucide-react";

/** Resumen del corredor: sumas de los datos DEMO visibles y estaciones con más bicis. */
export function MapOverview({
  stations,
  onPick,
  showList,
  mission,
}: {
  stations: DemoStation[];
  onPick: (id: string) => void;
  showList: boolean;
  /** Atajo a la misión de ejemplo. */
  mission?: { title: string; onOpen: () => void };
}) {
  const bikes = stations.reduce((sum, s) => sum + s.bikes_available, 0);
  const docks = stations.reduce((sum, s) => sum + s.docks_available, 0);
  const ranked = [...stations].sort((a, b) => b.bikes_available - a.bikes_available).slice(0, 6);

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Corredor Buenavista–Polanco</p>
          <h2 className="text-lg font-bold tracking-tight">{stations.length} estaciones</h2>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl bg-brand-100/80 p-3.5">
          <span className="grid size-8 place-items-center rounded-full bg-brand-500 text-white">
            <Bike aria-hidden className="size-4" />
          </span>
          <Metric value={bikes} unit="bicis" className="mt-2 block text-4xl text-brand-900" />
          <p className="text-xs font-medium text-ink-muted">en total · altura de cada torre</p>
        </div>
        <div className="rounded-3xl bg-lime-100 p-3.5">
          <span className="grid size-8 place-items-center rounded-full bg-lime-300 text-brand-900">
            <ParkingSquare aria-hidden className="size-4" />
          </span>
          <Metric value={docks} unit="anclajes" className="mt-2 block text-4xl text-brand-900" />
          <p className="text-xs font-medium text-ink-muted">libres en el corredor</p>
        </div>
      </div>

      {showList && mission ? (
        <button
          type="button"
          onClick={mission.onOpen}
          className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-lime-100 p-3 text-left transition-transform active:scale-[0.98]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-900 text-lime-300">
            <Target aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">Misión de ejemplo</span>
            <span className="block truncate text-sm font-semibold">{mission.title}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
        </button>
      ) : null}

      {showList ? (
        <section className="mt-5" aria-label="Estaciones con más bicis">
          <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Con más bicis ahora</h3>
          {ranked.length === 0 ? (
            <StateMessage kind="empty" title="Ninguna estación coincide con el filtro" />
          ) : (
            <ul className="space-y-2">
              {ranked.map((station, i) => {
                const status = bikesStatus(station.bikes_available);
                return (
                  <li key={station.id} className="animate-rise" style={{ animationDelay: `${60 + i * 45}ms` }}>
                    <button
                      type="button"
                      onClick={() => onPick(station.id)}
                      className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-soft transition-transform active:scale-[0.98]"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mist-100 text-xl font-bold tabular-nums">
                        {station.bikes_available}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{station.name}</span>
                        <span className={cn("flex items-center gap-1.5 text-xs font-medium", TONE_TEXT[status.tone])}>
                          <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[status.tone])} />
                          {status.label} · {station.zone}
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
