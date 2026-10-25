"use client";

import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { StateMessage } from "@/components/ui/state-message";
import { KpiCard } from "@/features/panel/kpi-card";
import { cn } from "@/lib/cn";
import { ClipboardList, Plus, ShieldCheck, UserX, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { regresoApi, type Actor, type Case, type StationOption } from "./api";
import { CaseDetail } from "./case-detail";
import { STATE_LABEL, STATE_TONE, TYPE_LABEL } from "./case-labels";
import { formatCdmxTime } from "./channels";
import { LossRiskSection } from "./loss-risk-section";
import { NewCaseForm } from "./new-case-form";
import { ScenariosCard } from "./scenarios-card";

const REFRESH_MS = 15_000;
type Filter = "open" | "closed" | "all";

/** /panel/casos · R5: cola de Regreso Seguro con ficha, asignación a Guardián e historial. */
export function CasesView() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [actor, setActor] = useState<Actor>("guardian");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setCases(await regresoApi.cases());
      setFetchedAt(new Date());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // Primera carga y luego cada 15 s; los casos nuevos llegan desde la app.
    const first = window.setTimeout(load, 0);
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    regresoApi
      .stations()
      .then(setStations)
      .catch(() => setStations([])); // sin catálogo se muestra el station_id
  }, []);

  const names = useMemo(() => new Map(stations.map((s) => [s.station_id, s.name])), [stations]);
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? null) : null);

  const totals = useMemo(() => {
    if (!cases) return null;
    const real = cases.filter((c) => !c.simulated); // lo SIMULADO nunca entra a los indicadores
    const open = real.filter((c) => c.is_open);
    return {
      open: open.length,
      review: open.filter((c) => c.state === "en_revision" || c.state === "devolucion_en_duda").length,
      unassigned: open.filter((c) => !c.assigned_to).length,
      reincorporated: real.filter((c) => c.state === "reincorporada").length,
    };
  }, [cases]);

  const visible = (cases ?? [])
    .filter((c) => filter === "all" || (filter === "open" ? c.is_open : !c.is_open))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const selected = cases?.find((c) => c.case_id === selectedId) ?? null;

  const upsert = (next: Case) => {
    setCases((prev) => [next, ...(prev ?? []).filter((c) => c.case_id !== next.case_id)]);
    setSelectedId(next.case_id);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Incidentes y casos</h1>
        <p className="max-w-3xl text-ink-muted">
          Bicis con robo, pérdida o una devolución en duda, desde el reporte hasta que vuelven al servicio. Los estados
          dicen dónde está la bici, nunca quién la tiene; solo un Guardián o el operador confirman una recuperación.
        </p>
        <p className="text-xs text-ink-muted" aria-live="polite">
          {failed
            ? "Sin conexión con la API; mostramos lo último que cargó."
            : fetchedAt
              ? `Datos en vivo de la API · actualizado a las ${formatCdmxTime(fetchedAt)}`
              : "Cargando…"}
        </p>
      </div>

      <section aria-label="Resumen de casos" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Casos abiertos" value={totals ? String(totals.open) : null} source="Línea 5" icon={ClipboardList} />
        <KpiCard label="En revisión o en duda" value={totals ? String(totals.review) : null} source="Línea 5" icon={Wrench} />
        <KpiCard label="Abiertos sin Guardián" value={totals ? String(totals.unassigned) : null} source="Línea 5" icon={UserX} />
        <KpiCard
          label="Bicis reincorporadas"
          value={totals ? String(totals.reincorporated) : null}
          source="C5 · Línea 5"
          icon={ShieldCheck}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Actúas como"
          value={actor}
          onChange={setActor}
          options={[
            { value: "guardian", label: "Guardián" },
            { value: "operador", label: "Operador" },
          ]}
        />
        {!creating ? (
          <Button variant="dark" onClick={() => setCreating(true)}>
            <Plus aria-hidden className="size-4" />
            Registrar caso
          </Button>
        ) : null}
      </div>

      {creating ? (
        <NewCaseForm
          stations={stations}
          actor={actor}
          onCancel={() => setCreating(false)}
          onCreated={(item) => {
            upsert(item);
            setCreating(false);
          }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card>
          <CardHeader
            title="Cola"
            description="Lo más reciente primero"
            action={
              <Segmented
                size="sm"
                label="Filtrar casos"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "open", label: "Abiertos" },
                  { value: "closed", label: "Cerrados" },
                  { value: "all", label: "Todos" },
                ]}
              />
            }
          />
          {cases === null ? (
            failed ? (
              <StateMessage
                kind="error"
                title="No pudimos cargar los casos"
                description="Revisa que la API esté corriendo."
                action={
                  <Button variant="dark" onClick={load}>
                    Intentar de nuevo
                  </Button>
                }
              />
            ) : (
              <StateMessage kind="loading" title="Cargando casos…" />
            )
          ) : visible.length === 0 ? (
            <StateMessage
              kind="empty"
              title={filter === "closed" ? "Aún no hay casos cerrados" : "No hay casos abiertos"}
              description="Los casos llegan cuando alguien usa «Anclé aquí» o un Guardián registra uno."
            />
          ) : (
            <ul className="space-y-2 p-3 pt-0">
              {visible.map((c) => (
                <li key={c.case_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.case_id)}
                    aria-current={c.case_id === selectedId ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-2xl px-4 py-3 text-left transition-colors",
                      c.case_id === selectedId ? "bg-brand-100" : "bg-surface hover:bg-brand-50",
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{TYPE_LABEL[c.type]}</span>
                      <Badge tone={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Badge>
                      {c.simulated ? <SimulatedBadge /> : null}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {nameOf(c.station_id) ?? (c.station_id ? `Estación ${c.station_id}` : "Sin estación")} ·{" "}
                      {formatCdmxTime(new Date(c.updated_at))} · {c.assigned_to ? `Guardián: ${c.assigned_to}` : "Sin asignar"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <CaseDetail key={selected.case_id} item={selected} stationName={nameOf(selected.station_id)} actor={actor} onChange={upsert} />
        ) : (
          <Card>
            <StateMessage kind="empty" title="Elige un caso" description="Aquí verás su ficha, historial y acciones." />
          </Card>
        )}
      </div>

      <ScenariosCard
        onRun={(item) => {
          upsert(item);
          setFilter("all");
        }}
      />

      <LossRiskSection stations={stations} />
    </div>
  );
}
