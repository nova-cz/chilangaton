"use client";

import type { Station } from "@/features/stations/types";
import { cn } from "@/lib/cn";

export type StationFilter = "all" | "bikes" | "docks";

export function filterStations(stations: Station[], filter: StationFilter) {
  if (filter === "bikes") return stations.filter((s) => (s.bikes_available ?? 0) > 0 && s.is_renting !== false);
  if (filter === "docks") return stations.filter((s) => (s.docks_available ?? 0) > 0 && s.is_returning !== false);
  return stations;
}

const OPTIONS: { value: StationFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "bikes", label: "Con bicis" },
  { value: "docks", label: "Con anclajes" },
];

/** Chips de filtro con conteo de las estaciones cargadas. */
export function FilterChips({
  stations,
  value,
  onChange,
  className,
}: {
  stations: Station[];
  value: StationFilter;
  onChange: (value: StationFilter) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Filtrar estaciones" className={cn("flex gap-1.5", className)}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 active:scale-95",
              active ? "bg-brand-900 text-white shadow-float" : "glass text-ink hover:bg-white",
            )}
          >
            {option.label}
            <span
              className={cn(
                "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] leading-5 tabular-nums max-[370px]:hidden",
                active ? "bg-lime-300 text-brand-900" : "bg-ink/8 text-ink-muted",
              )}
            >
              {filterStations(stations, option.value).length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
