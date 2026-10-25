"use client";

import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Metric } from "@/components/ui/ring";
import { cn } from "@/lib/cn";
import { ArrowLeft, Check, Clock3, Lock, MapPin, Repeat, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { MissionView } from "./types";

type Status = "available" | "in_progress" | "completed" | "locked";

const STEPS: { key: Exclude<Status, "locked">; label: string }[] = [
  { key: "available", label: "Disponible" },
  { key: "in_progress", label: "En curso" },
  { key: "completed", label: "Completada" },
];

/** Ficha de misión: ruta A→B, ventana, puntos virtuales y estados. El avance es local (DEMO), no se guarda. */
export function MissionDetail({ mission }: { mission: MissionView }) {
  const [status, setStatus] = useState<Status>(mission.state === "locked" ? "locked" : mission.state);
  const stepIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <article aria-labelledby="mission-title" className="mx-auto max-w-md space-y-4 px-4 pb-36">
      <Link href="/app/mision" className="inline-flex h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> Camino
      </Link>

      <header className="animate-rise">
        <div className="flex items-center gap-2">
          <Badge tone="dark">Misión</Badge>
          <DemoBadge />
        </div>
        <h1 id="mission-title" className="mt-2 text-3xl leading-tight font-bold tracking-tight">
          {mission.title}
        </h1>
      </header>

      <section aria-label="Ruta" className="animate-rise rounded-3xl bg-lime-100 p-4" style={{ animationDelay: "60ms" }}>
        <ol className="space-y-2">
          <Stop label="Recoge en" name={mission.from.name} zone={mission.from.zone} tone="bg-brand-500" />
          <li aria-hidden className="ml-[1.35rem] h-4 w-0.5 rounded bg-brand-900/25" />
          <Stop label="Deja en" name={mission.to.name} zone={mission.to.zone} tone="bg-brand-900" />
        </ol>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink-muted">
          <Clock3 aria-hidden className="size-4" /> {mission.window_label}
        </p>
      </section>

      <section aria-label="Puntos" className="animate-rise flex items-center justify-between rounded-3xl bg-brand-900 p-4 text-white" style={{ animationDelay: "120ms" }}>
        <div>
          <p className="text-xs font-semibold tracking-wide text-lime-300 uppercase">Puntos virtuales</p>
          <Metric value={`+${mission.points}`} unit="pts" className="text-5xl" />
        </div>
        <Sparkles aria-hidden className="size-9 text-lime-300" />
      </section>

      <section aria-label="Estado" className="animate-rise rounded-3xl bg-white p-4 shadow-soft" style={{ animationDelay: "180ms" }}>
        {status === "locked" ? (
          <p className="flex items-center gap-2 font-semibold text-ink-muted" role="status">
            <Lock aria-hidden className="size-5" /> Bloqueada: completa la misión anterior.
          </p>
        ) : (
          <>
            <ol className="flex items-center" aria-label="Progreso de la misión">
              {STEPS.map((step, i) => {
                const done = i < stepIndex || status === "completed";
                const active = i === stepIndex;
                return (
                  <li key={step.key} className="flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={active ? "step" : undefined}>
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-full text-sm font-bold transition-colors duration-300",
                        done ? "bg-brand-500 text-white" : active ? "bg-lime-300 text-brand-900 ring-4 ring-lime-100" : "bg-ink/5 text-ink-soft",
                      )}
                    >
                      {done ? <Check aria-hidden className="size-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={cn("text-[11px] font-semibold", active || done ? "text-ink" : "text-ink-soft")}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4" aria-live="polite">
              {status === "available" ? (
                <Button variant="dark" className="w-full justify-center" onClick={() => setStatus("in_progress")}>
                  Iniciar misión (demo)
                </Button>
              ) : status === "in_progress" ? (
                <Button variant="lime" className="w-full justify-center" onClick={() => setStatus("completed")}>
                  Simular entrega en {mission.to.name}
                </Button>
              ) : (
                <p className="rounded-2xl bg-brand-100 px-4 py-3 text-center font-semibold text-brand-900">
                  Completada · +{mission.points} puntos virtuales
                </p>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-ink-muted">Simulación local: no se guarda ni se conecta a ECOBICI.</p>
          </>
        )}
      </section>

      <aside className="animate-rise flex gap-3 rounded-3xl bg-warning-100 p-4 text-warning-700" style={{ animationDelay: "240ms" }}>
        <Repeat aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm font-semibold">
          Regla: A→B→A no da puntos. Si regresas la bici a {mission.from.name}, la misión no suma.
        </p>
      </aside>

      <p className="text-center text-xs text-ink-muted">Puntos virtuales, sin canje real.</p>
    </article>
  );
}

function Stop({ label, name, zone, tone }: { label: string; name: string; zone: string; tone: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/85 px-3 py-2.5">
      <span className={cn("grid size-8 place-items-center rounded-full text-white", tone)}>
        <MapPin aria-hidden className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-ink-muted">{label}</span>
        <span className="block truncate font-semibold">{name}</span>
        <span className="block text-xs text-ink-muted">{zone}</span>
      </span>
    </li>
  );
}
