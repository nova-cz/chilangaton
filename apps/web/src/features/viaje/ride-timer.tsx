"use client";

import { Button } from "@/components/ui/button";
import { Metric, Ring } from "@/components/ui/ring";
import { Segmented } from "@/components/ui/segmented";
import { APP_TABS } from "@/features/navigation/routes";
import { cn } from "@/lib/cn";
import { Check, LifeBuoy, MapPin, Square, Volume2, Vibrate } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { splitName } from "./format";
import type { TripPrefs } from "./types";

const LIMIT = 45;
/** Avisos antes del límite (min transcurridos). El de 45 y 90 es el "¿Todo bien?" de Línea 5. */
const MILESTONES = [35, 40, 42] as const;
const CHECKS = [45, 90] as const;

type Speed = 1 | 30;

interface Clock {
  anchorMs: number;
  anchorMin: number;
  speed: Speed;
}

/** V5 · contador de 45 min con avisos por texto, voz y vibración. No cierra viajes reales. */
export function RideTimer({
  stationName,
  fallbackName,
  graceMin,
  prefs,
  onEnd,
}: {
  stationName: string;
  fallbackName?: string;
  graceMin?: number;
  prefs: TripPrefs;
  onEnd: () => void;
}) {
  const [clock, setClock] = useState<Clock>(() => ({ anchorMs: Date.now(), anchorMin: 0, speed: 1 }));
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const [check, setCheck] = useState<number | null>(null);
  const fired = useRef(new Set<number>());
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const street = splitName(stationName).street;

  // Valores vivos para el intervalo (sin reiniciarlo en cada render).
  const live = useRef({ clock, prefs, street, fallbackName });
  useEffect(() => {
    live.current = { clock, prefs, street, fallbackName };
  });

  useEffect(() => {
    const say = (text: string, strong = false) => {
      const { prefs: pr } = live.current;
      setNotice(text);
      if (pr.voice && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "es-MX";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
      if (pr.vibration && "vibrate" in navigator) navigator.vibrate(strong ? [300, 120, 300, 120, 300] : [200, 100, 200]);
    };
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const { clock: c, street: st, fallbackName: fb } = live.current;
      const el = c.anchorMin + ((t - c.anchorMs) / 60000) * c.speed;
      for (const m of [...MILESTONES, ...CHECKS]) {
        if (el < m || fired.current.has(m)) continue;
        fired.current.add(m);
        if (m === 35) say(`Llevas 35 minutos. Te quedan 10 para anclar en ${st}.`);
        if (m === 40) say(`Te quedan 5 minutos. Dirígete a ${st}.`);
        if (m === 42)
          say(fb ? `Quedan 3 minutos. Si ${st} está llena, ve a ${splitName(fb).street}.` : `Quedan 3 minutos para anclar en ${st}.`, true);
        if (m === 45 || m === 90) {
          say(m === 45 ? "Se cumplieron 45 minutos. ¿Todo bien?" : "Llevas 90 minutos. ¿Todo bien?", true);
          setCheck(m);
        }
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = clock.anchorMin + ((now - clock.anchorMs) / 60000) * clock.speed;
  const left = Math.max(0, LIMIT - elapsed);
  const over = elapsed > LIMIT;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (check !== null && !d.open) d.showModal();
    if (check === null && d.open) d.close();
  }, [check]);

  const setSpeed = (speed: Speed) => setClock({ anchorMs: Date.now(), anchorMin: elapsed, speed });
  const mm = Math.floor(left);
  const ss = Math.floor((left - mm) * 60);
  const helpReady = APP_TABS.some((t) => t.key === "help" && "ready" in t && t.ready);
  const tone = over ? "danger" : elapsed >= 40 ? "warn" : "ok";

  return (
    <section ref={root} aria-label="Contador del viaje" className="scroll-mt-24 animate-sheet-in rounded-[var(--radius-sheet)] bg-brand-900 p-5 text-white">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <MapPin aria-hidden className="size-4 shrink-0 text-lime-300" />
          <span className="truncate">Anclas en {street}</span>
        </p>
        <Segmented
          tone="dark"
          size="sm"
          label="Velocidad del contador"
          value={clock.speed}
          onChange={setSpeed}
          options={[
            { value: 1, label: "Real" },
            { value: 30, label: "Demo ×30" },
          ]}
        />
      </div>

      <div className="mt-5 flex flex-col items-center">
        <Ring
          value={Math.min(elapsed / LIMIT, 1)}
          size={208}
          stroke={14}
          trackClass="text-white/10"
          barClass={cn(tone === "ok" && "text-lime-300", tone === "warn" && "text-[#f5c26b]", tone === "danger" && "text-[#ff9e9e]")}
        >
          {over ? (
            <>
              <Metric value={`+${Math.floor(elapsed - LIMIT)}`} unit="min" className="text-5xl" />
              <p className="mt-1 text-xs font-semibold text-white/70">después de 45</p>
            </>
          ) : (
            <>
              <span className="text-5xl font-bold tracking-tight tabular-nums">
                {mm}:{String(ss).padStart(2, "0")}
              </span>
              <p className="mt-1 text-xs font-semibold text-white/70">para anclar</p>
            </>
          )}
        </Ring>
        <p className="sr-only" aria-live="polite">
          {Math.ceil(left)} minutos restantes
        </p>
      </div>

      {/* Hitos */}
      <ol className="mt-6 grid grid-cols-4 gap-1.5 text-center" aria-label="Avisos">
        {[...MILESTONES, LIMIT].map((m) => {
          const done = elapsed >= m;
          return (
            <li key={m} className={cn("rounded-2xl px-1 py-2", done ? "bg-lime-300 text-brand-900" : "bg-white/8 text-white/70")}>
              <Metric value={m} unit="min" className="text-lg" />
              <p className="text-[11px] font-semibold">{m === LIMIT ? "¿Todo bien?" : `Faltan ${LIMIT - m}`}</p>
            </li>
          );
        })}
      </ol>

      <p
        role="status"
        aria-live="assertive"
        className={cn("mt-4 min-h-12 rounded-2xl px-3.5 py-3 text-[15px] font-semibold", notice ? "bg-white/10" : "text-white/60")}
      >
        {notice ?? "Te avisamos a los 35, 40 y 42 minutos."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
        <span className="inline-flex items-center gap-1">
          <Volume2 aria-hidden className="size-3.5" /> Voz {prefs.voice ? "activada" : "apagada"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Vibrate aria-hidden className="size-3.5" /> Vibración {prefs.vibration ? "activada" : "apagada"}
        </span>
        {graceMin ? <span>Gracia propuesta +{graceMin} min (no aplica hoy)</span> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="lime" className="justify-center" onClick={onEnd}>
          <Check aria-hidden className="size-4" /> Ya anclé
        </Button>
        <Button variant="glass" className="justify-center bg-white/10 text-white hover:bg-white/20" onClick={onEnd}>
          <Square aria-hidden className="size-4" /> Detener
        </Button>
      </div>
      <p className="mt-3 text-xs text-white/60">
        Este contador es tuyo: no cierra tu viaje en ECOBICI ni cobra nada. Para cerrar, ancla la bici hasta escuchar el aviso del anclaje.
      </p>

      <dialog
        ref={dialog}
        onClose={() => setCheck(null)}
        aria-labelledby="todo-bien-title"
        className="m-auto w-[min(92vw,26rem)] rounded-[var(--radius-sheet)] bg-card p-5 text-ink shadow-float backdrop:bg-brand-900/60"
      >
        <h2 id="todo-bien-title" className="text-xl font-bold tracking-tight">
          ¿Todo bien?
        </h2>
        <p className="mt-1 text-ink-muted">
          {check === 90 ? "Llevas 90 minutos con la bici." : "Se cumplieron 45 minutos."} Cuéntanos para ayudarte si hace falta.
        </p>
        <div className="mt-4 grid gap-2">
          <Button variant="dark" className="justify-center" onClick={onEnd}>
            <Check aria-hidden className="size-4" /> Sí, ya la anclé
          </Button>
          <Button variant="soft" className="justify-center" onClick={() => setCheck(null)}>
            Sigo en camino
          </Button>
          {helpReady ? (
            <Link href="/app/ayuda" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-danger-100 font-semibold text-danger-700">
              <LifeBuoy aria-hidden className="size-4" /> Necesito ayuda
            </Link>
          ) : (
            <p className="rounded-2xl bg-mist-100 px-3.5 py-2.5 text-sm text-ink-muted">
              <LifeBuoy aria-hidden className="mr-1 inline size-4 align-[-3px]" />
              La ruta de ayuda (Regreso Seguro) la conecta Línea 5.
            </p>
          )}
        </div>
      </dialog>
    </section>
  );
}
