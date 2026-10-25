"use client";

import { DemoBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { regresoApi, type LossRiskResponse, type StationOption } from "./api";
import type { RiskPoint } from "./loss-risk-map";

const LossRiskMap = dynamic(() => import("./loss-risk-map"), {
  ssr: false,
  loading: () => <StateMessage kind="loading" title="Cargando mapa…" className="h-full" />,
});

/** R5 · Riesgo de pérdida por estación y franja (contrato C6 de la Línea 2). Es riesgo, no robo comprobado. */
export function LossRiskSection({ stations }: { stations: StationOption[] }) {
  const [data, setData] = useState<LossRiskResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    regresoApi
      .lossRisk()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const byId = useMemo(() => new Map(stations.map((s) => [s.station_id, s])), [stations]);
  const rows = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => b.disappeared_bikes - a.disappeared_bikes),
    [data],
  );
  const points = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r.station_id, (totals.get(r.station_id) ?? 0) + r.disappeared_bikes);
    return [...totals].flatMap(([id, bikes]): RiskPoint[] => {
      const s = byId.get(id);
      return s ? [{ station_id: id, name: s.name, lat: s.lat, lon: s.lon, bikes }] : [];
    });
  }, [rows, byId]);

  const nameOf = (id: string, code?: string | null) => byId.get(id)?.name ?? (code ? `CE-${code}` : `Estación ${id}`);

  return (
    <Card>
      <CardHeader
        title="Riesgo de pérdida por estación"
        description="Bicis que dejaron de aparecer (último arribo y ninguna salida en 3 semanas o más), por estación y franja. Es riesgo, no robo comprobado."
        action={data?.mode === "EJEMPLO" ? <DemoBadge /> : null}
      />
      {failed ? (
        <StateMessage
          kind="error"
          title="No pudimos cargar el riesgo de pérdida"
          description="Lo publica la Línea 2 en /taller/loss-risk. Revisa que la API esté corriendo."
        />
      ) : !data ? (
        <StateMessage kind="loading" title="Cargando riesgo de pérdida…" />
      ) : rows.length === 0 ? (
        <StateMessage kind="empty" title="Sin estaciones con bicis que dejaron de aparecer" />
      ) : (
        <div className="grid gap-4 p-5 pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="h-80 overflow-hidden rounded-3xl bg-surface lg:h-96">
            <LossRiskMap points={points} />
          </div>
          <div>
            <p className="text-sm text-ink-muted">
              {data.total_bikes} bicis en total; aquí las {rows.length} estaciones y franjas con más ·{" "}
              {data.mode === "REAL" ? "viajes oficiales de ECOBICI" : "datos de ejemplo"}
            </p>
            <ol
              aria-label="Estaciones con más bicis que dejaron de aparecer"
              tabIndex={0}
              className="mt-2 max-h-80 space-y-2 overflow-y-auto rounded-2xl lg:max-h-96"
            >
              {rows.map((r) => (
                <li key={`${r.station_id}-${r.time_band}`} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{nameOf(r.station_id, r.short_name)}</p>
                    <p className="text-sm text-ink-muted">{r.time_band} (hora CDMX)</p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="text-xl font-bold tabular-nums">{r.disappeared_bikes}</span>
                    <span className="ml-1 text-xs font-semibold text-ink-muted">bicis</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <p className="px-5 pb-5 text-xs text-ink-muted">
        Solo mostramos la estación, nunca la ubicación precisa de una bici. Fuente: contrato C6 de la Línea 2.
      </p>
    </Card>
  );
}
