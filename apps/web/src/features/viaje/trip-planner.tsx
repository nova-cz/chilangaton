"use client";

import { Skeleton, StateMessage } from "@/components/ui/state-message";
import { Button } from "@/components/ui/button";
import { TONE_DOT, TONE_TEXT } from "@/features/stations/status";
import { cn } from "@/lib/cn";
import { ArrowDownUp, ChevronDown, Footprints, History, Repeat2, Settings2, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HOME, REPLAY_AT, STORY, getNearby, getRecommendation, getStations, type StationChoices } from "./data";
import { LIGHT_TONE, cdmxStamp, pct, replayLabel, splitName, walkMinutes } from "./format";
import { usePrefs } from "./prefs";
import { RideTimer } from "./ride-timer";
import { TripRibbon } from "./trip-ribbon";
import type { NearbyRow, Recommendation, ViajeStation } from "./types";
import { ModeBadge } from "./viaje-shell";


type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: T; mode: string };

export function TripPlanner() {
  const router = useRouter();
  const params = useSearchParams();
  const [prefs] = usePrefs();
  const [stations, setStations] = useState<Load<StationChoices>>({ status: "loading" });
  const [nearby, setNearby] = useState<NearbyRow[]>([]);
  const [recState, setRec] = useState<Load<Recommendation> & { key?: string }>({ status: "loading" });
  const [chosen, setChosen] = useState<string | null>(null);
  const [riding, setRiding] = useState(false);
  const [reload, setReload] = useState(0);

  const rawFrom = params.get("from") ?? STORY?.from ?? "";
  const rawTo = params.get("to") ?? STORY?.to ?? "";
  const choices = stations.status === "ok" ? stations.data : null;
  // "REAL" = datos reales de una mañana pasada (no en vivo): siempre se avisa que es repetición.
  const replayText =
    REPLAY_AT || (stations.status === "ok" && stations.mode === "REAL")
      ? REPLAY_AT
        ? replayLabel(REPLAY_AT)
        : cdmxStamp(stations.status === "ok" ? stations.data.origins[0]?.data_ts : null)
      : null;
  // Solo cuenta lo elegido si existe en las listas; si no, la pantalla pide elegir.
  const from = choices?.origins.some((s) => s.station_id === rawFrom) ? rawFrom : "";
  const to = choices?.destinations.some((s) => s.station_id === rawTo) ? rawTo : "";
  const tripKey = `${from}>${to}>${prefs.maxWalk}>${prefs.avoidEffort}>${prefs.acceptAlternative}>${reload}`;
  // Si lo que tenemos es de otro viaje, mostramos "cargando" en vez de datos viejos.
  const rec: Load<Recommendation> = recState.key === tripKey ? recState : { status: "loading" };
  const originStation = stations.status === "ok" ? stations.data.origins.find((s) => s.station_id === from) : undefined;
  const walkToOrigin = originStation ? walkMinutes(HOME, originStation) : 3;

  const setRoute = (next: { from?: string; to?: string }) => {
    const q = new URLSearchParams(params.toString());
    if (next.from) q.set("from", next.from);
    if (next.to) q.set("to", next.to);
    setChosen(null);
    setRiding(false);
    router.replace(`/app/viaje?${q}`, { scroll: false });
  };

  useEffect(() => {
    let alive = true;
    Promise.all([getStations(), getNearby()])
      .then(([s, n]) => {
        if (!alive) return;
        setStations({ status: "ok", data: s.data, mode: s.mode });
        setNearby(n.data);
      })
      .catch((e: unknown) => alive && setStations({ status: "error", message: e instanceof Error ? e.message : "Sin conexión" }));
    return () => {
      alive = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!from || !to || from === to || stations.status !== "ok") return;
    let alive = true;
    getRecommendation(from, to, prefs, walkToOrigin)
      .then((r) => alive && setRec({ key: tripKey, status: "ok", data: r, mode: r.mode }))
      .catch((e: unknown) => alive && setRec({ key: tripKey, status: "error", message: e instanceof Error ? e.message : "Sin conexión" }));
    return () => {
      alive = false;
    };
  }, [from, to, prefs, reload, walkToOrigin, stations.status, tripKey]);

  const recData = rec.status === "ok" ? rec.data : null;
  const target = chosen ?? recData?.destination.station_id ?? to;
  const targetAlt = recData?.alternatives.find((a) => a.station_id === target);
  const targetName = targetAlt?.name ?? recData?.destination.name ?? "";
  const fallback = useMemo(
    () => (recData ? [recData.destination, ...recData.alternatives].find((s) => s.station_id !== target)?.name : undefined),
    [recData, target],
  );

  if (stations.status === "error") {
    return (
      <StateMessage
        kind="error"
        title="No pudimos cargar las estaciones"
        description={`${stations.message}. Revisa que la API esté encendida o usa el modo DEMO.`}
        action={
          <Button variant="dark" size="sm" onClick={() => setReload((n) => n + 1)}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
      {/* Columna 1: a dónde vas */}
      <div className="min-w-0 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] leading-tight font-bold tracking-tight lg:text-4xl">¿A dónde vas?</h1>
            {stations.status === "ok" ? <ModeBadge mode={stations.mode} /> : null}
          </div>
          <p className="mt-1 text-ink-muted">
            Te decimos qué tan probable es encontrar bici al salir y lugar al llegar.
          </p>
          {replayText ? (
            <p className="mt-2 inline-flex items-start gap-2 rounded-2xl bg-mist-100 px-3 py-2 text-sm text-ink">
              <History aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
              <span>
                <span className="font-semibold">Repetición del {replayText}.</span> Usamos los datos de esa mañana, no los de ahorita.
              </span>
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-card)] bg-card p-2 shadow-soft">
          {stations.status === "loading" ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : (
            <div className="relative">
              <StationSelect label="Salgo de" dot="bg-brand-500" value={from} stations={stations.data.origins} onChange={(v) => setRoute({ from: v })} />
              <div className="mx-4 border-t border-dashed border-line" />
              <StationSelect label="Voy a" dot="bg-brand-900" value={to} stations={stations.data.destinations} onChange={(v) => setRoute({ to: v })} />
              {stations.data.origins.some((x) => x.station_id === to) && stations.data.destinations.some((x) => x.station_id === from) ? (
              <button
                type="button"
                onClick={() => setRoute({ from: to, to: from })}
                aria-label="Invertir origen y destino"
                className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-brand-100 text-brand-900 hover:bg-brand-200"
              >
                <ArrowDownUp aria-hidden className="size-4" />
              </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Chip icon={<Footprints aria-hidden className="size-3.5" />}>
            {prefs.avoidEffort ? "Máximo 2 min a pie" : `Camino hasta ${prefs.maxWalk} min`}
          </Chip>
          <Chip icon={prefs.acceptAlternative ? <Shuffle aria-hidden className="size-3.5" /> : <Repeat2 aria-hidden className="size-3.5" />}>
            {prefs.acceptAlternative ? "Acepto otra estación" : "Solo mi destino"}
          </Chip>
          <Link href="/app/ajustes" className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-brand-700 hover:underline">
            <Settings2 aria-hidden className="size-3.5" /> Cambiar
          </Link>
        </div>
      </div>

      {nearby.length ? (
          <section aria-labelledby="cerca" className="min-w-0 max-lg:order-3 lg:col-start-1 lg:self-start">
            <h2 id="cerca" className="text-sm font-semibold text-ink-muted">
              Cerca de ti en {HOME.label}
            </h2>
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-card shadow-soft">
              {nearby.slice(0, 4).map((n) => {
                const tone = LIGHT_TONE[n.light];
                return (
                  <li key={n.station_id} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", TONE_DOT[tone])} />
                    <Link href={`/app/estacion/${n.station_id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-semibold hover:underline">{splitName(n.name).street}</span>
                      <span className="block text-sm text-ink-muted">
                        Estación {n.station_id} · {Math.max(1, Math.round(n.walk_min))} min a pie · {n.useful_bikes_now}{" "}
                        {n.useful_bikes_now === 1 ? "bici útil" : "bicis útiles"}
                      </span>
                      <span className={cn("block text-sm font-semibold", TONE_TEXT[tone])}>{pct(n.p_useful_bike)}% de bici al llegar</span>
                    </Link>
                    <Button
                      variant={n.station_id === from ? "dark" : "soft"}
                      size="sm"
                      onClick={() => setRoute({ from: n.station_id })}
                      aria-pressed={n.station_id === from}
                    >
                      {n.station_id === from ? "Origen" : "Salir de aquí"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

      {/* Columna 2: el viaje (en móvil va antes de "Cerca de ti") */}
      <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2 max-lg:order-2">
        {stations.status === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : !from || !to ? (
          <StateMessage
            kind="empty"
            title={!from && !to ? "Elige de dónde sales y a dónde vas" : !from ? "Elige de dónde sales" : "Elige a dónde vas"}
            description="Con tus dos estaciones te decimos si habrá bici al salir y lugar al llegar."
          />
        ) : from === to ? (
          <StateMessage kind="empty" title="Elige un destino distinto" description="El origen y el destino son la misma estación." />
        ) : rec.status === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-40" />
          </div>
        ) : rec.status === "error" ? (
          <StateMessage kind="error" title="No pudimos calcular ese viaje" description={rec.message} />
        ) : riding ? (
          <RideTimer
            stationName={targetName}
            fallbackName={fallback}
            graceMin={targetAlt?.grace_min}
            prefs={prefs}
            onEnd={() => setRiding(false)}
          />
        ) : (
          <TripRibbon
            rec={rec.data}
            walkToOrigin={walkToOrigin}
            chosen={target}
            onChoose={setChosen}
            onChooseOrigin={(id) => setRoute({ from: id })}
            onStart={() => setRiding(true)}
            replay={Boolean(replayText)}
          />
        )}
        {recData ? (
          <p className="mt-3 px-1 text-xs text-ink-soft">
            Cálculo con 500 mañanas simuladas a partir del promedio de 28 días. Estado de la estación: {cdmxStamp(recData.data_ts)} (hora CDMX).
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StationSelect({
  label,
  dot,
  value,
  stations,
  onChange,
}: {
  label: string;
  dot: string;
  value: string;
  stations: ViajeStation[];
  onChange: (id: string) => void;
}) {
  const current = stations.find((s) => s.station_id === value);
  const id = `sel-${label}`;
  return (
    <div className="relative flex items-center gap-3 rounded-2xl px-3 py-2.5 pr-16 focus-within:bg-brand-50">
      <span aria-hidden className={cn("size-3 shrink-0 rounded-full ring-4 ring-white", dot)} />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-xs font-semibold text-ink-muted">
          {label}
        </label>
        <p aria-hidden className={cn("truncate font-semibold", !current && "text-ink-soft")}>
          {current ? splitName(current.name).street : "Elige estación"}
          {current && splitName(current.name).area ? (
            <span className="font-normal text-ink-muted"> · {splitName(current.name).area}</span>
          ) : null}
        </p>
      </div>
      <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-soft" />
      {/* Select nativo encima: accesible y cómodo en móvil */}
      <select
        id={id}
        value={current ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {!current ? (
          <option value="" disabled>
            Elige estación
          </option>
        ) : null}
        {stations.map((s) => (
          <option key={s.station_id} value={s.station_id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist-100 px-3 py-1.5 font-semibold text-ink">
      {icon}
      {children}
    </span>
  );
}
