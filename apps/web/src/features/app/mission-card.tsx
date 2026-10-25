import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BikeHero } from "@/components/three/bike-hero";
import type { DemoMission } from "@/features/demo/types";
import type { Station } from "@/features/stations/types";
import { cn } from "@/lib/cn";
import { Gift, MapPin, Navigation } from "lucide-react";

/** Misión de rebalanceo de EJEMPLO. La lógica real (puntos, antiabuso) es S5. */
export function MissionCard({
  mission,
  stations,
  onShowStation,
  className,
}: {
  mission: DemoMission;
  stations: Station[];
  onShowStation?: (id: string) => void;
  className?: string;
}) {
  const from = stations.find((s) => s.id === mission.from_station_id);
  const to = stations.find((s) => s.id === mission.to_station_id);
  if (!from || !to) return null;

  return (
    <article
      aria-labelledby={`mission-${mission.id}`}
      className={cn("overflow-hidden rounded-[var(--radius-sheet)] bg-lime-100", className)}
    >
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <Badge tone="dark">Misión</Badge>
          <DemoBadge />
        </div>
        <h2 id={`mission-${mission.id}`} className="mt-2 text-2xl leading-tight font-bold tracking-tight">
          {mission.title}
        </h2>
      </div>
      <BikeHero className="h-44 w-full lg:h-52" />

      <ol className="mx-4 -mt-2 grid gap-1.5" aria-label="Ruta de la misión">
        <RouteStop label="Recoge en" name={from.name} dot="bg-brand-500" />
        <RouteStop label="Deja en" name={to.name} dot="bg-brand-900" />
      </ol>

      <div className="m-2 mt-3 rounded-[1.6rem] bg-brand-900 p-3 text-white">
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Gift aria-hidden className="size-4 text-lime-300" />
            {mission.reward.label}
          </span>
          <span className="text-xs text-white/70">{mission.window_label}</span>
        </div>
        {onShowStation ? (
          <Button variant="lime" className="mt-3 w-full justify-center" onClick={() => onShowStation(from.id)}>
            <Navigation aria-hidden className="size-4" /> Ver punto de inicio
          </Button>
        ) : null}
        <p className="mt-2 px-1 text-[11px] text-white/70">
          Sin canje real: Equilibici no está conectado a ECOBICI ni otorga recompensas.
        </p>
      </div>
    </article>
  );
}

function RouteStop({ label, name, dot }: { label: string; name: string; dot: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2">
      <span className={cn("grid size-7 place-items-center rounded-full text-white", dot)}>
        <MapPin aria-hidden className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-ink-muted">{label}</span>
        <span className="block truncate text-sm font-semibold">{name}</span>
      </span>
    </li>
  );
}
