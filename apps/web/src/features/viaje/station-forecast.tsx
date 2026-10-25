"use client";

import { buttonClasses } from "@/components/ui/button";
import { Metric, Ring } from "@/components/ui/ring";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton, StateMessage } from "@/components/ui/state-message";
import { TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { Bike, Clock3, MapPin, ParkingSquare, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DockStrip, timesOutOfTen } from "./dock-strip";
import { FORECAST_HORIZONS, getForecast } from "./data";
import { LIGHT_LABEL, LIGHT_TONE, cdmxStamp, lightOf, pct, splitName } from "./format";
import type { ForecastPoint, ViajeStation } from "./types";
import { ModeBadge } from "./viaje-shell";

type Load =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ok"; station: ViajeStation; forecast: ForecastPoint[]; mode: string };

/** /app/estacion/[id] · estado ahora + curva "si llegas en…" (contrato C3). */
export function StationForecast({ id }: { id: string }) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [kind, setKind] = useState<"bike" | "dock">("bike");
  const [horizon, setHorizon] = useState<number>(15);

  useEffect(() => {
    let alive = true;
    getForecast(id)
      .then((r) => alive && setState(r ? { status: "ok", ...r.data, mode: r.mode } : { status: "missing" }))
      .catch((e: unknown) => alive && setState({ status: "error", message: e instanceof Error ? e.message : "Sin conexión" }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (state.status === "missing") {
    return (
      <StateMessage
        kind="empty"
        title="No encontramos esa estación"
        description="Puede que el número esté mal o que no esté en el escenario de ejemplo."
        action={
          <Link href="/app/viaje" className={buttonClasses("dark", "sm")}>
            Planear un viaje
          </Link>
        }
      />
    );
  }
  if (state.status === "error") {
    return <StateMessage kind="error" title="No pudimos cargar el pronóstico" description={state.message} />;
  }

  const { station, forecast, mode } = state;
  const { street, area } = splitName(station.name);
  const point = forecast.find((f) => f.horizon_min === horizon) ?? forecast[0];
  const p = point ? (kind === "bike" ? point.p_useful_bike : point.p_free_dock) : 0;
  const light = lightOf(p);
  const bikes = station.useful_bikes_now;
  const docks = station.docks_available_now;
  const occupancy = bikes !== null ? bikes / Math.max(1, station.capacity) : null;

  return (
    <article aria-labelledby="st-name" className="mx-auto max-w-2xl">
      <header className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
          <MapPin aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 id="st-name" className="text-2xl leading-tight font-bold tracking-tight lg:text-3xl">
            {street}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {area ? <span>{area}</span> : null}
            <span>Estación {station.station_id}</span>
            <ModeBadge mode={mode} />
          </div>
        </div>
      </header>

      {/* Ahora */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Tile tint="bg-brand-100/70" iconTint="bg-brand-500 text-white" icon={<Bike aria-hidden className="size-4" />} label="Bicis útiles" value={bikes} />
        <Tile tint="bg-lime-100" iconTint="bg-lime-300 text-brand-900" icon={<ParkingSquare aria-hidden className="size-4" />} label="Anclajes libres" value={docks} />
        <div className="flex flex-col items-center justify-center rounded-3xl bg-mist-100 p-2.5">
          <Ring value={occupancy ?? 0} size={58} stroke={6} trackClass="text-white" barClass="text-brand-700">
            {occupancy !== null ? <Metric value={Math.round(occupancy * 100)} unit="%" className="text-base" /> : "—"}
          </Ring>
          <p className="mt-1.5 text-center text-[11px] font-semibold text-ink-muted">Ocupación de {station.capacity}</p>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-ink-soft">
        <Clock3 aria-hidden className="size-3.5" />
        Estado del {cdmxStamp(station.data_ts)} (hora CDMX). “Útiles” descuenta las bicis que podrían estar dañadas.
      </p>

      {mode === "REAL" && (station.ignored_bikes ?? 0) >= 1 ? (
        <p role="note" className="mt-3 flex gap-2.5 rounded-2xl bg-warning-100 px-3.5 py-3 text-sm text-ink">
          <Wrench aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-700" />
          <span>
            {station.ignored_bikes === 1
              ? "Hay 1 bici que lleva rato aquí sin que nadie la tome; podría estar descompuesta."
              : `Hay ${station.ignored_bikes} bicis que llevan rato aquí sin que nadie las tome; algunas podrían estar descompuestas.`}{" "}
            Es una pista, no una certeza.
          </span>
        </p>
      ) : null}

      {/* Si llegas en… */}
      <section aria-labelledby="curva" className="mt-6 rounded-[var(--radius-card)] bg-card p-4 shadow-soft lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="curva" className="text-lg font-bold tracking-tight">
            Si llegas en…
          </h2>
          <Segmented
            size="sm"
            label="Qué buscas"
            value={kind}
            onChange={setKind}
            options={[
              { value: "bike", label: "Bici" },
              { value: "dock", label: "Lugar" },
            ]}
          />
        </div>

        <table className="mt-4 w-full table-fixed border-separate border-spacing-x-1">
          <caption className="sr-only">
            Probabilidad de {kind === "bike" ? "bici útil" : "lugar para anclar"} según en cuántos minutos llegues
          </caption>
          <thead className="sr-only">
            <tr>
              {forecast.map((f) => (
                <th key={f.horizon_min} scope="col">
                  {f.horizon_min} min
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {forecast.map((f) => {
                const v = kind === "bike" ? f.p_useful_bike : f.p_free_dock;
                const t = LIGHT_TONE[lightOf(v)];
                const active = f.horizon_min === horizon;
                return (
                  <td key={f.horizon_min} className="p-0 align-bottom">
                    <button
                      type="button"
                      onClick={() => setHorizon(f.horizon_min)}
                      aria-pressed={active}
                      aria-label={`${f.horizon_min} minutos: ${pct(v)}%`}
                      className={cn("group flex w-full flex-col items-center rounded-2xl pt-1 pb-2 transition-colors", active ? "bg-brand-900 text-white" : "hover:bg-brand-50")}
                    >
                      <span className={cn("text-sm font-bold tabular-nums", !active && TONE_TEXT[t])}>{pct(v)}%</span>
                      <span className="mt-1 flex h-36 w-full items-end justify-center px-1.5">
                        <span
                          className={cn(
                            "w-full max-w-9 rounded-t-xl rounded-b-md transition-[height] duration-500",
                            active ? "bg-lime-300" : t === "ok" ? "bg-brand-500" : t === "warn" ? "bg-warning-500" : "bg-danger-500",
                          )}
                          style={{ height: `${Math.max(4, pct(v))}%` }}
                        />
                      </span>
                      <span className={cn("mt-1.5 text-xs font-semibold", active ? "text-white/80" : "text-ink-muted")}>{f.horizon_min}′</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="mt-4 rounded-3xl bg-surface p-4" aria-live="polite">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-semibold">Llegando en {horizon} min</p>
              <p className={cn("text-sm font-semibold", TONE_TEXT[LIGHT_TONE[light]])}>{LIGHT_LABEL[kind][light]}</p>
            </div>
            <Metric value={pct(p)} unit="%" className="text-3xl leading-none" />
          </div>
          <DockStrip p={p} kind={kind} className="mt-3" />
          <p className="mt-2 text-sm text-ink-muted">
            En {timesOutOfTen(p)} de cada 10 mañanas como esta {kind === "bike" ? "hay al menos una bici útil" : "queda al menos un anclaje libre"}.
          </p>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Minutos desde ahora: {FORECAST_HORIZONS.join(", ")}. El color siempre va con texto y porcentaje.
        </p>
      </section>

      <div className="mt-5 flex flex-col gap-2 rounded-[var(--radius-card)] bg-brand-900 p-3 sm:flex-row">
        <Link href={`/app/viaje?from=${station.station_id}`} className={buttonClasses("lime", "md", "flex-1 justify-center")}>
          <Bike aria-hidden className="size-4" /> Salir de aquí
        </Link>
        <Link href={`/app/viaje?to=${station.station_id}`} className={buttonClasses("glass", "md", "flex-1 justify-center bg-white/10 text-white hover:bg-white/20")}>
          <ParkingSquare aria-hidden className="size-4" /> Llegar aquí
        </Link>
      </div>
    </article>
  );
}

function Tile({ tint, iconTint, icon, label, value }: { tint: string; iconTint: string; icon: ReactNode; label: string; value: number | null }) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl p-2.5 text-center", tint)}>
      <span className={cn("grid size-9 place-items-center rounded-full", iconTint)}>{icon}</span>
      <p className="mt-1.5 text-[11px] font-semibold text-ink-muted">{label}</p>
      {value === null ? <span className="text-2xl font-bold">—</span> : <Metric value={value} className="text-2xl lg:text-3xl" />}
    </div>
  );
}
