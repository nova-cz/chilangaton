import { DemoBadge } from "@/components/ui/badge";
import { Metric } from "@/components/ui/ring";
import { Flame, Gem } from "lucide-react";
import type { PlayerStats } from "./types";

/** Barra superior fija: nivel, puntos virtuales y racha. Todo DEMO. */
export function MissionStatsBar({ player }: { player: PlayerStats }) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-surface/95 px-4 pb-3 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <span className="rounded-full bg-brand-900 px-3.5 py-2 text-sm font-bold text-lime-300">Nivel {player.level}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-2 text-brand-900">
          <Gem aria-hidden className="size-4 text-brand-600" />
          <Metric value={player.points} unit="pts" className="text-base" />
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-warning-100 px-3 py-2 text-warning-700">
          <Flame aria-hidden className="size-4" />
          <Metric value={player.streak_days} unit={player.streak_days === 1 ? "día" : "días"} className="text-base" />
        </span>
        <DemoBadge className="ml-auto" />
      </div>
    </header>
  );
}

/** Banner verde oscuro con el avance del camino y la leyenda obligatoria. */
export function JourneyBanner({ done, total }: { done: number; total: number }) {
  return (
    <section aria-label="Avance del camino" className="rounded-3xl bg-brand-900 p-4 text-white shadow-float">
      <p className="text-xs font-semibold tracking-wide text-lime-300 uppercase">Camino del corredor</p>
      <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight">Reforma → Buenavista</h1>
      <div className="mt-3 flex items-center gap-1.5" role="img" aria-label={`${done} de ${total} misiones completadas`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < done ? "h-2 flex-1 rounded-full bg-lime-300" : "h-2 flex-1 rounded-full bg-white/20"} />
        ))}
      </div>
      <p className="mt-2 text-sm text-white/80">
        {done} de {total} completadas
      </p>
      <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/80">Puntos virtuales, sin canje real.</p>
    </section>
  );
}
