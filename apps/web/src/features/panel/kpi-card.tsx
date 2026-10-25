import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

/** KPI con estado "sin datos" explícito: nunca se rellenan cifras inventadas. */
export function KpiCard({
  label,
  value,
  unit,
  target,
  source,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | null;
  unit?: string;
  target?: string;
  source: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-muted">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          <Icon aria-hidden className="size-5" />
        </span>
      </div>
      {value === null ? (
        <div>
          <p className="text-3xl font-bold tracking-tight text-ink-soft" aria-label="Sin datos">
            —
          </p>
          <p className="mt-1 text-xs font-medium text-ink-muted">Sin datos todavía</p>
        </div>
      ) : (
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          {value}
          {unit ? <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span> : null}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-ink-muted">
        {target ? <span>Meta: {target}</span> : null}
        <span>Fuente: {source}</span>
      </div>
    </Card>
  );
}
