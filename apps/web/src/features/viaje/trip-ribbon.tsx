"use client";

import { Button } from "@/components/ui/button";
import { Metric } from "@/components/ui/ring";
import { TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { Bike, Footprints, MapPin, ParkingSquare, Play, Timer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DockStrip, timesOutOfTen } from "./dock-strip";
import { LIGHT_LABEL, LIGHT_TONE, pct, splitName } from "./format";
import type { Alternative, Recommendation } from "./types";

/**
 * El viaje como una línea: sales, pedaleas, llegas. Si el destino podría llenarse,
 * la línea se bifurca hacia la estación alternativa con sus minutos de gracia.
 */
export function TripRibbon({
  rec,
  walkToOrigin,
  chosen,
  onChoose,
  onChooseOrigin,
  onStart,
}: {
  rec: Recommendation;
  walkToOrigin: number;
  chosen: string;
  onChoose: (stationId: string) => void;
  onChooseOrigin: (stationId: string) => void;
  onStart: () => void;
}) {
  const originAlt = rec.origin_alternatives?.[0];
  const { origin, destination, alternatives } = rec;
  const best = alternatives[0];
  const others = alternatives.slice(1);
  const chosenAlt = alternatives.find((a) => a.station_id === chosen);
  const finalName = chosenAlt?.name ?? destination.name;

  return (
    <section aria-label="Tu viaje" className="animate-fade-in">
      <ol className="relative">
        {/* Rail */}
        <span aria-hidden className="absolute top-6 bottom-24 left-[19px] w-[3px] rounded-full bg-gradient-to-b from-brand-500 via-brand-300 to-brand-900/70" />

        <Stop
          marker={<Bike aria-hidden className="size-4" />}
          markerClass="bg-brand-500 text-white"
          eyebrow={`Sales de · ${walkToOrigin} min caminando`}
          title={origin.name}
          href={`/app/estacion/${origin.station_id}`}
          tint="bg-brand-100/80"
        >
          <Odds p={origin.p_useful_bike} kind="bike" what="hay bici útil al llegar" />
          {typeof origin.useful_bikes_now === "number" ? (
            <p className="mt-1 text-xs text-ink-soft">
              Estación {origin.station_id} · ahora {origin.useful_bikes_now} {origin.useful_bikes_now === 1 ? "bici útil" : "bicis útiles"}
            </p>
          ) : null}
        </Stop>

        {originAlt ? (
          <li className="relative pt-3 pb-1 pl-[52px]">
            <svg aria-hidden className="absolute -top-4 left-[19px] h-14 w-10 overflow-visible" fill="none">
              <path d="M1.5 0 C1.5 30, 34 22, 34 52" stroke="var(--color-lime-500)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
            </svg>
            <div className="rounded-[var(--radius-card)] bg-lime-300 p-4 text-brand-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-brand-900/70">Mejor sal de la estación {originAlt.station_id}</p>
                  <Link href={`/app/estacion/${originAlt.station_id}`} className="mt-0.5 block font-bold tracking-tight hover:underline">
                    {splitName(originAlt.name).street}
                  </Link>
                </div>
                <div className="shrink-0 text-right">
                  <Metric value={`+${Math.max(1, Math.round(originAlt.extra_walk_min))}`} unit="min" className="text-3xl leading-none" />
                  <p className="text-[11px] font-semibold text-brand-900/70">a pie</p>
                </div>
              </div>
              <DockStrip p={originAlt.p_useful_bike} kind="bike" className="mt-3" />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {pct(originAlt.p_useful_bike)}% de bici útil · {timesOutOfTen(originAlt.p_useful_bike)} de cada 10 mañanas
                </p>
                <button
                  type="button"
                  onClick={() => onChooseOrigin(originAlt.station_id)}
                  className="rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-semibold hover:bg-white"
                >
                  Salir de aquí
                </button>
              </div>
            </div>
          </li>
        ) : null}

        <li className="relative flex items-center gap-3 py-3 pl-[52px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-soft">
            <Bike aria-hidden className="size-4 text-brand-600" />
            <Metric value={Math.round(destination.ride_min)} unit="min" className="text-base" />
            <span className="text-ink-muted">en bici · llegas {destination.arrival_local}</span>
          </span>
          <span className="hidden text-xs text-ink-soft sm:inline">{destination.ride_source}</span>
        </li>

        <Stop
          marker={<MapPin aria-hidden className="size-4" />}
          markerClass="bg-brand-900 text-lime-300"
          eyebrow="Tu destino"
          title={destination.name}
          href={`/app/estacion/${destination.station_id}`}
          tint={destination.light === "verde" ? "bg-lime-100" : "bg-warning-100/60"}
          selectable={alternatives.length > 0}
          selected={chosen === destination.station_id}
          onSelect={() => onChoose(destination.station_id)}
        >
          <Odds p={destination.p_free_dock} kind="dock" what="hay lugar para anclar" />
        </Stop>

        {best ? (
          <li className="relative pt-3 pl-[52px]">
            {/* Bifurcación */}
            <svg aria-hidden className="absolute -top-4 left-[19px] h-14 w-10 overflow-visible" fill="none">
              <path d="M1.5 0 C1.5 30, 34 22, 34 52" stroke="var(--color-lime-500)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
            </svg>
            <AltCard alt={best} selected={chosen === best.station_id} onSelect={() => onChoose(best.station_id)} />
            {others.length ? (
              <ul className="mt-2 space-y-1.5" aria-label="Otras estaciones con lugar">
                {others.map((a) => (
                  <li key={a.station_id}>
                    <button
                      type="button"
                      onClick={() => onChoose(a.station_id)}
                      aria-pressed={chosen === a.station_id}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm transition-colors",
                        chosen === a.station_id ? "bg-brand-900 text-white" : "bg-white hover:bg-brand-50",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold">{splitName(a.name).street}</span>
                      <span className="shrink-0 tabular-nums">
                        {pct(a.p_free_dock)}% lugar · {Math.round(a.walk_to_destination_min)} min a pie
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ) : null}
      </ol>

      {/* Barra de acción */}
      <div className="mt-5 rounded-[var(--radius-card)] bg-brand-900 p-4 text-white">
        <p className="text-[15px] leading-snug font-semibold" aria-live="polite">
          {chosenAlt ? `Vas a anclar en ${splitName(finalName).street}. ` : null}
          {chosenAlt ? `Camina ${Math.round(chosenAlt.walk_to_destination_min)} min a tu destino.` : rec.advice}
        </p>
        {chosenAlt ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
            <Timer aria-hidden className="size-4 text-lime-300" />
            Propuesta: +{chosenAlt.grace_min} min de gracia por cambiar de estación (aún no aplica en ECOBICI).
          </p>
        ) : null}
        <Button variant="lime" className="mt-3.5 w-full justify-center" onClick={onStart}>
          <Play aria-hidden className="size-4" />
          Iniciar contador de 45 min
        </Button>
      </div>
    </section>
  );
}

function Stop({
  marker,
  markerClass,
  eyebrow,
  title,
  href,
  tint,
  selectable,
  selected,
  onSelect,
  children,
}: {
  marker: ReactNode;
  markerClass: string;
  eyebrow: string;
  title: string;
  href: string;
  tint: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  const { street, area } = splitName(title);
  return (
    <li className="relative flex gap-3">
      <span className={cn("relative z-10 mt-4 grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-surface", markerClass)}>
        {marker}
      </span>
      <div className={cn("min-w-0 flex-1 rounded-[var(--radius-card)] p-4", tint, selected && "ring-2 ring-brand-900")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-muted">{eyebrow}</p>
            <Link href={href} className="mt-0.5 block font-bold tracking-tight text-ink hover:underline">
              {street}
            </Link>
            {area ? <p className="text-sm text-ink-muted">{area}</p> : null}
          </div>
          {selectable ? (
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                selected ? "bg-brand-900 text-white" : "bg-white text-ink hover:bg-brand-50",
              )}
            >
              {selected ? "Elegida" : "Anclar aquí"}
            </button>
          ) : null}
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}

/** Número grande + diez anclajes + frase en frecuencia. */
function Odds({ p, kind, what }: { p: number; kind: "bike" | "dock"; what: string }) {
  const light = p >= 0.8 ? "verde" : p >= 0.5 ? "amarillo" : "rojo";
  const tone = LIGHT_TONE[light];
  const Icon = kind === "bike" ? Bike : ParkingSquare;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <Metric value={pct(p)} unit="%" className="text-4xl leading-none" />
        <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", TONE_TEXT[tone])}>
          <Icon aria-hidden className="size-4" />
          {LIGHT_LABEL[kind][light]}
        </span>
      </div>
      <DockStrip p={p} kind={kind} className="mt-2.5" />
      <p className="mt-2 text-sm text-ink-muted">
        En {timesOutOfTen(p)} de cada 10 mañanas como esta {what}.
      </p>
    </div>
  );
}

function AltCard({ alt, selected, onSelect }: { alt: Alternative; selected: boolean; onSelect: () => void }) {
  const { street, area } = splitName(alt.name);
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-lime-300 p-4 text-brand-900", selected && "ring-2 ring-brand-900 ring-offset-2 ring-offset-surface")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-900/70">Mejor déjala en</p>
          <Link href={`/app/estacion/${alt.station_id}`} className="mt-0.5 block font-bold tracking-tight hover:underline">
            {street}
          </Link>
          {area ? <p className="text-sm text-brand-900/70">{area}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <Metric value={`+${alt.grace_min}`} unit="min" className="text-3xl leading-none" />
          <p className="text-[11px] font-semibold text-brand-900/70">de gracia</p>
        </div>
      </div>
      <DockStrip p={alt.p_free_dock} kind="dock" className="mt-3" />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {pct(alt.p_free_dock)}% de lugar ·{" "}
          <Footprints aria-hidden className="inline size-4 align-[-3px]" /> {Math.round(alt.walk_to_destination_min)} min a tu destino
        </p>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            selected ? "bg-brand-900 text-lime-300" : "bg-white/70 hover:bg-white",
          )}
        >
          {selected ? "Elegida" : "Anclar aquí"}
        </button>
      </div>
    </div>
  );
}
