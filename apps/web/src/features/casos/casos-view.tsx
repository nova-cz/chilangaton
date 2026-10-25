"use client";

import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { StateMessage } from "@/components/ui/state-message";
import { cdmxTime } from "@/features/bici-util/format";
import { KpiCard } from "@/features/panel/kpi-card";
import { cn } from "@/lib/cn";
import { CircleCheck, FolderOpen, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useCasos } from "./data";
import { ACTOR_LABEL, STATE_LABEL, TYPE_LABEL } from "./labels";

type Filter = "open" | "closed" | "all";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Abiertos" },
  { value: "closed", label: "Cerrados" },
  { value: "all", label: "Todos" },
];

/** /panel/casos · seguimiento de bicis que no volvieron como se esperaba. Dónde está la bici, nunca quién la tiene. */
export function CasosView() {
  const { data, source, loading } = useCasos();
  const [filter, setFilter] = useState<Filter>("open");

  const sorted = useMemo(() => [...data.cases].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [data.cases]);
  const rows = sorted.filter((c) => (filter === "all" ? true : filter === "open" ? c.is_open : !c.is_open));
  const open = data.cases.filter((c) => c.is_open).length;
  const closed = data.cases.length - open;
  const where = (id: string | null) => (id ? (data.names[id] ?? `Estación ${id}`) : "Estación sin identificar");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Incidentes y casos</h1>
        <p className="max-w-3xl text-ink-muted">
          Seguimiento de las bicis que no volvieron como se esperaba: robos reportados, pérdidas, anclajes que no se registraron y
          viajes muy largos. Cada caso dice dónde está la bici, nunca quién la tiene.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          {source !== "api" ? <DemoBadge /> : <Badge tone="brand">En vivo</Badge>}
          <span>
            {source === "ejemplo" ? "Casos de ejemplo para la demo; no son casos reales." : null}
            {source === "respaldo" ? "La API no respondió: se muestran casos de ejemplo." : null}
            {source === "api" ? "Casos registrados en la API." : null}
          </span>
        </div>
      </div>

      <section aria-label="Resumen" aria-busy={loading} className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Casos abiertos" value={String(open)} unit="casos" source="Seguimiento de casos" icon={FolderOpen} />
        <KpiCard label="Casos cerrados" value={String(closed)} unit="casos" source="Seguimiento de casos" icon={CircleCheck} />
        <KpiCard
          label="Con guardián asignado"
          value={String(data.cases.filter((c) => c.is_open && c.assigned_to).length)}
          unit={`de ${open} abiertos`}
          source="Seguimiento de casos"
          icon={ShieldAlert}
        />
      </section>

      <Card>
        <CardHeader
          title="Casos"
          description="Del más reciente al más antiguo. Abre un caso para ver su historia."
          action={<Segmented size="sm" label="Filtrar casos" value={filter} onChange={setFilter} options={FILTERS} />}
        />
        <div className="px-5 pb-5">
          {rows.length === 0 ? (
            <StateMessage
              kind="empty"
              title={filter === "closed" ? "Aún no hay casos cerrados" : "No hay casos abiertos"}
              description="Cuando alguien reporte un problema desde la app, aparecerá aquí."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((c) => (
                <li key={c.case_id} className="py-3">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{TYPE_LABEL[c.type]}</span>
                        <span className="block truncate text-sm text-ink-muted">{where(c.station_id)}</span>
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          c.is_open ? "bg-warning-100 text-warning-700" : "bg-brand-100 text-brand-900",
                        )}
                      >
                        <span aria-hidden className={cn("size-2 rounded-full", c.is_open ? "bg-warning-500" : "bg-brand-500")} />
                        {c.is_open ? "Abierto" : "Cerrado"} · {STATE_LABEL[c.state]}
                      </span>
                      <span className="text-xs text-ink-muted">Actualizado {cdmxTime(c.updated_at)}</span>
                    </summary>
                    <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
                      {c.history.map((h, i) => (
                        <li key={i} className="text-sm">
                          <p className="font-semibold">
                            {STATE_LABEL[h.to_state]} <span className="font-normal text-ink-muted">· {cdmxTime(h.ts)}</span>
                          </p>
                          <p className="text-ink-muted">
                            {ACTOR_LABEL[h.actor]}
                            {h.note ? `: ${h.note}` : ""}
                          </p>
                        </li>
                      ))}
                      {c.assigned_to ? <li className="text-sm text-ink-muted">Asignado a {c.assigned_to}</li> : null}
                    </ol>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
