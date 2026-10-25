import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Metric } from "@/components/ui/ring";
import { cn } from "@/lib/cn";
import { nf } from "./format";
import type { ContraflujoResult } from "./types";

/** Resultado de S2: datos reales de septiembre (no simulados), con zonas aproximadas. */
export function ContraflujoCard({ data }: { data: ContraflujoResult }) {
  return (
    <Card>
      <CardHeader
        title="Contraflujo real (S2)"
        description="Viajes de Anzures, Polanco y Reforma hacia Buenavista y San Rafael, días hábiles de septiembre, 7:00–10:00."
        action={<Badge tone="neutral">Datos reales</Badge>}
      />
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <Metric value={nf.format(data.trips_per_day_avg)} unit="viajes/día" className="text-5xl" />
            <p className="mt-1 text-xs text-ink-muted">
              Mínimo {data.trips_per_day_min} · máximo {data.trips_per_day_max} en {data.window.days} días hábiles
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-bold",
              data.viable ? "bg-brand-100 text-brand-900" : "bg-warning-100 text-warning-700",
            )}
          >
            {data.viable ? "Viable" : "No viable"}
          </span>
        </div>
        <p className="mt-3 rounded-2xl bg-surface p-3 text-sm">{data.conclusion}</p>
        <ul className="mt-3 space-y-1.5 text-sm" aria-label="Pares de zonas con más viajes">
          {data.by_zone_pair.slice(0, 3).map((pair) => (
            <li key={`${pair.from}-${pair.to}`} className="flex justify-between gap-3">
              <span>{pair.from} → {pair.to}</span>
              <span className="font-semibold tabular-nums">{nf.format(pair.trips_per_day)} /día</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">Criterio: {data.criterion}. Zonas aproximadas con círculos.</p>
      </div>
    </Card>
  );
}
