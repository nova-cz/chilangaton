import { Badge, DemoBadge } from "@/components/ui/badge";
import type { DemoMission, DemoStation } from "@/features/demo/types";
import { cn } from "@/lib/cn";
import { ArrowRight, Gift } from "lucide-react";

/** Misión de rebalanceo de EJEMPLO. La lógica real (puntos, antiabuso) es S5. */
export function MissionCard({
  mission,
  stations,
  onShowStation,
  className,
}: {
  mission: DemoMission;
  stations: DemoStation[];
  onShowStation?: (id: string) => void;
  className?: string;
}) {
  const from = stations.find((s) => s.id === mission.from_station_id);
  const to = stations.find((s) => s.id === mission.to_station_id);
  if (!from || !to) return null;

  return (
    <article
      aria-labelledby={`mission-${mission.id}`}
      className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-brand-900 p-4 text-white", className)}
    >
      <div aria-hidden className="absolute -top-16 -right-10 size-44 rounded-full bg-brand-500/30 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <Badge tone="brand">Misión</Badge>
        <DemoBadge />
      </div>
      <h2 id={`mission-${mission.id}`} className="relative mt-2 text-lg leading-snug font-bold">
        {mission.title}
      </h2>
      <div className="relative mt-3 flex items-center gap-2 text-sm">
        <StationChip label={from.name} onClick={onShowStation ? () => onShowStation(from.id) : undefined} />
        <ArrowRight aria-label="hacia" className="size-4 shrink-0 text-brand-300" />
        <StationChip label={to.name} onClick={onShowStation ? () => onShowStation(to.id) : undefined} />
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Gift aria-hidden className="size-4 text-brand-300" />
          {mission.reward.label}
        </span>
        <span className="text-xs text-white/75">{mission.window_label}</span>
      </div>
      <p className="relative mt-2 text-[11px] text-white/70">
        Sin canje real: Equilibici no está conectado a ECOBICI ni otorga recompensas.
      </p>
    </article>
  );
}

function StationChip({ label, onClick }: { label: string; onClick?: () => void }) {
  const cls = "min-w-0 truncate rounded-full bg-white/12 px-3 py-1.5 font-medium";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "hover:bg-white/20")}>
      {label}
    </button>
  ) : (
    <span className={cls}>{label}</span>
  );
}
