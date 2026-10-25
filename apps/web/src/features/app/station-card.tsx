"use client";

import { ModeBadge } from "@/features/viaje/viaje-shell";
import { cdmxStamp } from "@/features/viaje/format";
import { buttonClasses } from "@/components/ui/button";
import { Metric, Ring } from "@/components/ui/ring";
import { Segmented } from "@/components/ui/segmented";
import { HORIZONS, type Horizon } from "@/features/demo/types";
import type { Station } from "@/features/stations/types";
import { bikesStatus, docksStatus, OUTLOOK_COPY, TONE_TEXT, type Tone } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { Bike, Clock3, MapPin, ParkingSquare, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

/** Colores del pronóstico de ejemplo sobre la barra oscura (contraste AA sobre brand-900). */
const DARK_TONE_TEXT: Record<Tone, string> = { ok: "text-lime-300", warn: "text-[#f5c26b]", danger: "text-[#ff9e9e]" };
const DARK_TONE_DOT: Record<Tone, string> = { ok: "bg-lime-300", warn: "bg-warning-500", danger: "bg-danger-500" };

/** Tarjeta flotante de estación: bicis, anclajes y horizonte con estado de EJEMPLO. */
export function StationCard({ station, mode, onClose }: { station: Station; mode: string; onClose: () => void }) {
  const [horizon, setHorizon] = useState<Horizon>(15);
  const bikes = station.is_renting === false ? { tone: "danger" as const, label: "No permite retirar" } : bikesStatus(station.bikes_available);
  const docks = station.is_returning === false ? { tone: "danger" as const, label: "No permite devolver" } : docksStatus(station.docks_available);
  const outlook = station.example_outlook ? OUTLOOK_COPY[station.example_outlook[`${horizon}`]] : null;
  const occupancy = station.docks_available !== null && station.capacity > 0
    ? Math.max(0, Math.min(1, (station.capacity - station.docks_available) / station.capacity)) : null;
  const demo = mode === "DEMO" || mode.includes("EJEMPLO");
  const stationId = encodeURIComponent(station.id);

  return (
    <article aria-labelledby={`station-${station.id}`} className="animate-sheet-in">
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
          <MapPin aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`station-${station.id}`} className="truncate text-xl font-bold tracking-tight">
            {station.name}
          </h2>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm text-ink-muted">{station.zone}</span>
            <ModeBadge mode={demo ? "EJEMPLO" : mode} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar estación"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Tile
          delay={40}
          tint="bg-brand-100/70"
          iconTint="bg-brand-500 text-white"
          icon={<Bike aria-hidden className="size-4" />}
          label="Bicis"
          value={station.bikes_available}
          status={bikes}
        />
        <Tile
          delay={90}
          tint="bg-lime-100"
          iconTint="bg-lime-300 text-brand-900"
          icon={<ParkingSquare aria-hidden className="size-4" />}
          label="Anclajes"
          value={station.docks_available}
          status={docks}
        />
        <div className="flex animate-rise flex-col items-center justify-center rounded-3xl bg-mist-100 p-2.5" style={{ animationDelay: "140ms" }}>
          <Ring value={occupancy ?? 0} size={58} stroke={6} trackClass="text-white" barClass="text-brand-700">
            <Metric value={occupancy === null ? "—" : Math.round(occupancy * 100)} unit={occupancy === null ? undefined : "%"} className="text-base" />
          </Ring>
          <p className="mt-1.5 text-center text-[11px] font-semibold text-ink-muted">Ocupación de {station.capacity}</p>
        </div>
      </div>

      {demo && outlook ? <section className="mt-3 rounded-3xl bg-brand-900 p-3.5 text-white" aria-label="Estado de ejemplo por horizonte">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock3 aria-hidden className="size-4 text-lime-300" />
            Al llegar en
          </p>
          <Segmented
            tone="dark"
            size="sm"
            label="Horizonte"
            value={horizon}
            onChange={setHorizon}
            options={HORIZONS.map((h) => ({ value: h, label: `${h} min` }))}
          />
        </div>
        <p className={cn("mt-3 flex items-center gap-2 text-[15px] font-semibold", DARK_TONE_TEXT[outlook.tone])} aria-live="polite">
          <span aria-hidden className={cn("size-2.5 rounded-full", DARK_TONE_DOT[outlook.tone])} />
          {outlook.label}
        </p>
        <p className="mt-1 text-xs text-white/70">
          Estado de ejemplo, no es un pronóstico. La probabilidad real está en Viaje.
        </p>
      </section> : <div className="mt-3 rounded-3xl bg-brand-50 p-3 text-sm text-ink-muted">
        <p>{mode.startsWith("VIVO") ? "Actualización" : "Registro histórico"}: {cdmxStamp(station.data_ts)} · CDMX.</p>
        <Link href={`/app/estacion/${stationId}`} className="mt-2 inline-block font-semibold text-brand-700 underline">Ver estación y pronóstico</Link>
      </div>}

      <Link href={demo || station.is_renting === false ? "/app/viaje" : `/app/viaje?from=${stationId}`} className={cn(buttonClasses("dark", "md"), "mt-3 w-full justify-center")}>
        <Bike aria-hidden className="size-4" />
        {demo || station.is_renting === false ? "Planear un viaje" : "Salir de aquí"}
      </Link>
    </article>
  );
}

function Tile({
  delay,
  tint,
  iconTint,
  icon,
  label,
  value,
  status,
}: {
  delay: number;
  tint: string;
  iconTint: string;
  icon: ReactNode;
  label: string;
  value: number | null;
  status: { tone: Tone; label: string };
}) {
  return (
    <div className={cn("flex animate-rise flex-col items-center rounded-3xl p-2.5 text-center", tint)} style={{ animationDelay: `${delay}ms` }}>
      <span className={cn("grid size-9 place-items-center rounded-full", iconTint)}>{icon}</span>
      <p className="mt-1.5 text-[11px] font-semibold text-ink-muted">{label}</p>
      <Metric value={value ?? "—"} className="text-5xl leading-none" />
      <p className={cn("text-[11px] leading-tight font-semibold", TONE_TEXT[status.tone])}>{status.label}</p>
    </div>
  );
}
