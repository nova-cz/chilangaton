"use client";

import type { Station } from "@/features/stations/types";
import { bikesStatus, normalize, TONE_DOT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { MapPin, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

/** Búsqueda de estaciones (combobox accesible) sobre el catálogo cargado. */
export function StationSearch({
  stations,
  onPick,
  className,
}: {
  stations: Station[];
  onPick: (id: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return stations.filter((s) => normalize(`${s.name} ${s.zone}`).includes(q)).slice(0, 6);
  }, [query, stations]);

  const pick = (id: string) => {
    onPick(id);
    setQuery("");
    setOpen(false);
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Buscar estación o colonia
      </label>
      <div className="glass flex h-12 items-center gap-2 rounded-full pr-1.5 pl-4">
        <Search aria-hidden className="size-[18px] shrink-0 text-ink-muted" />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
          autoComplete="off"
          placeholder="¿A dónde vas? Busca estación o colonia"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              pick(results[active].id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-soft focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setQuery("")}
            className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-ink/5"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados de estaciones"
          className="glass absolute inset-x-0 top-14 z-30 animate-fade-in overflow-hidden rounded-3xl p-1.5"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-muted" role="option" aria-selected={false} aria-disabled>
              No encontramos estaciones con esa búsqueda.
            </li>
          ) : (
            results.map((station, index) => {
              const status = bikesStatus(station.bikes_available);
              return (
                <li
                  key={station.id}
                  id={`${listId}-${station.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(station.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5",
                    index === active ? "bg-brand-50" : "hover:bg-ink/[0.03]",
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-700">
                    <MapPin aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{station.name}</span>
                    <span className="block text-xs text-ink-muted">{station.zone}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <span aria-hidden className={cn("size-2 rounded-full", TONE_DOT[status.tone])} />
                    {station.bikes_available ?? "—"} bicis
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
