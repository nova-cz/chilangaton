"use client";

import { DemoBadge } from "@/components/ui/badge";
import { StateMessage } from "@/components/ui/state-message";
import type { DemoStation } from "@/features/demo/types";
import { bikesStatus, docksStatus, TONE_DOT, TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { ChevronRight } from "lucide-react";

/** Lista equivalente al mapa (misma información, accesible con lector de pantalla). */
export function StationList({
  stations,
  selectedId,
  onSelect,
}: {
  stations: DemoStation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (stations.length === 0) {
    return <StateMessage kind="empty" title="No hay estaciones para mostrar" description="Los datos DEMO están vacíos." />;
  }
  const zones = [...new Set(stations.map((s) => s.zone))];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Estaciones del corredor</h2>
        <DemoBadge />
      </div>
      {zones.map((zone) => (
        <section key={zone} aria-labelledby={`zone-${zone}`}>
          <h3 id={`zone-${zone}`} className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {zone}
          </h3>
          <ul className="space-y-2">
            {stations
              .filter((s) => s.zone === zone)
              .map((station) => {
                const bikes = bikesStatus(station.bikes_available);
                const docks = docksStatus(station.docks_available);
                const selected = station.id === selectedId;
                return (
                  <li key={station.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(station.id)}
                      aria-current={selected || undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-3xl border bg-card p-3.5 text-left shadow-soft transition-colors",
                        selected ? "border-brand-500 ring-2 ring-brand-200" : "border-line hover:border-brand-200",
                      )}
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-900 tabular-nums">
                        {station.bikes_available}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{station.name}</span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-medium">
                          <span className={cn("flex items-center gap-1", TONE_TEXT[bikes.tone])}>
                            <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[bikes.tone])} />
                            {bikes.label}
                          </span>
                          <span className={cn("flex items-center gap-1", TONE_TEXT[docks.tone])}>
                            <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[docks.tone])} />
                            {station.docks_available} anclajes · {docks.label}
                          </span>
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
