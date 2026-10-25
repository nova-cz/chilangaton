"use client";

import { Segmented } from "@/components/ui/segmented";
import { normalize, TONE_DOT, TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { overClock, pct, usefulState } from "./format";
import type { BiciUtilStation } from "./types";

type Filter = "problem" | "empty" | "clock" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "problem", label: "Con problema" },
  { value: "empty", label: "Sin bici útil" },
  { value: "clock", label: "Fuera de 36 h" },
  { value: "all", label: "Todas" },
];

const PAGE = 40;

/** Peor primero: sin bici útil, luego más horas en el reloj, luego más % vacía a esta hora. */
function rank(s: BiciUtilStation) {
  return (s.is_renting ? 0 : 1e6) + (s.useful_bikes === 0 ? 0 : 1e4) - (s.disabled_hours ?? 0) * 10 - s.pct_empty_hour;
}

/** Tabla equivalente al mapa: misma información, navegable con teclado y lector de pantalla. */
export function StationsTable({
  stations,
  selectedId,
  onSelect,
}: {
  stations: BiciUtilStation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("problem");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const q = normalize(query);
    return stations
      .filter((s) => {
        if (q && !normalize(`${s.name} ${s.short_name ?? ""} ${s.station_id}`).includes(q)) return false;
        if (filter === "empty") return s.is_renting && s.useful_bikes === 0;
        if (filter === "clock") return overClock(s);
        if (filter === "problem") return s.is_renting && (s.useful_bikes === 0 || overClock(s) || s.bikes_disabled > 0);
        return true;
      })
      .sort((a, b) => rank(a) - rank(b));
  }, [stations, filter, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 px-5 pb-3">
        <Segmented label="Filtrar estaciones" options={FILTERS} value={filter} onChange={(v) => { setFilter(v); setLimit(PAGE); }} size="sm" className="self-start" />
        <label className="relative block">
          <span className="sr-only">Buscar estación por nombre o código</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
            placeholder="Buscar: Buenavista, 271, Reforma…"
            className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </label>
        <p className="text-xs text-ink-muted" aria-live="polite">
          {rows.length.toLocaleString("es-MX")} estaciones
        </p>
      </div>
      <div tabIndex={0} role="region" aria-label="Tabla de estaciones" className="relative min-h-0 flex-1 overflow-auto px-5 pb-5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
        <table className="w-full min-w-[600px] text-sm">
          <caption className="sr-only">Bici útil por estación, ordenadas de peor a mejor</caption>
          <thead className="sticky top-0 bg-card">
            <tr className="text-left text-xs whitespace-nowrap text-ink-muted">
              <th scope="col" className="py-2 font-semibold">Estación</th>
              <th scope="col" className="py-2 font-semibold">Estado</th>
              <th scope="col" className="py-2 text-right font-semibold">Útiles</th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">Deshab.</th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">Reloj</th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">Vacía a esta hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.slice(0, limit).map((s) => {
              const st = usefulState(s);
              const selected = s.station_id === selectedId;
              const over = overClock(s);
              return (
                <tr key={s.station_id} className={cn(selected && "bg-brand-50")}>
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => onSelect(selected ? null : s.station_id)}
                      aria-pressed={selected}
                      className="rounded text-left hover:underline focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                    >
                      {s.name}
                    </button>
                  </th>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", st.tone === "closed" ? "text-ink-muted" : TONE_TEXT[st.tone])}>
                      <span aria-hidden className={cn("size-2 rounded-full", st.tone === "closed" ? "bg-ink-soft" : TONE_DOT[st.tone])} />
                      {st.label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{s.is_renting ? s.useful_bikes : "—"}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">{s.is_renting ? s.bikes_disabled : "—"}</td>
                  <td className={cn("py-2.5 pl-3 text-right whitespace-nowrap tabular-nums", over && "font-bold text-danger-700")}>
                    {s.disabled_hours ? `${Math.round(s.disabled_hours)} h` : "—"}
                    {over ? <span className="sr-only"> (fuera del plazo de 36 h)</span> : null}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">{s.is_renting ? pct(s.pct_empty_hour, 0) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > limit ? (
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="mt-3 w-full rounded-full border border-line py-2 text-sm font-semibold text-ink-muted hover:bg-ink/5"
          >
            Mostrar {Math.min(PAGE, rows.length - limit)} más
          </button>
        ) : null}
      </div>
    </div>
  );
}
