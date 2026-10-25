"use client";

import { SimulatedBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { useState } from "react";
import { ComparisonTable } from "./comparison-table";
import { cdmxTime, delta } from "./format";
import { RecoveredToggle } from "./recovered-toggle";
import { ScenarioChart } from "./scenario-chart";
import { ScenarioPicker } from "./scenario-picker";
import type { Scenario } from "./scenarios";
import type { SimulationResults } from "./types";

/** Controles + gráfica + comparación + supuestos, todo desde modules/distribucion/fixtures/simulation_results.json. */
export function SimulatorView({ data }: { data: SimulationResults }) {
  const [scenario, setScenario] = useState<Scenario>(20);
  const [recovered, setRecovered] = useState(false);
  const results = data.scenarios[recovered ? "true" : "false"];
  const none = results["0"];
  const picked = results[String(scenario)];
  const maxGap = Math.max(
    0,
    ...(results["20"]?.series ?? []).map((p, i) => Math.abs(p.empty_stations_target - (none?.series[i]?.empty_stations_target ?? p.empty_stations_target))),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-3 shadow-soft">
        <ScenarioPicker enabled value={scenario} onChange={setScenario} />
        <RecoveredToggle checked={recovered} onChange={setRecovered} />
      </div>

      {none && picked ? (
        <p className="rounded-2xl bg-brand-900 px-4 py-3 text-sm text-white" role="status" aria-live="polite">
          Con {scenario} % de adopción{recovered ? " y bicis recuperadas antes" : ""}, las horas estación-vacía en Buenavista y San Rafael pasan de{" "}
          <strong>{none.totals.empty_station_hours_target} h</strong> a <strong>{picked.totals.empty_station_hours_target} h</strong>:{" "}
          {delta(picked.totals.empty_station_hours_target, none.totals.empty_station_hours_target, "h")}.
        </p>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Escenarios de adopción" description="Estaciones sin bicis en Buenavista y San Rafael cada 15 minutos." action={<SimulatedBadge />} />
          <ScenarioChart results={results} selected={scenario} />
          <p className="px-5 pb-5 text-xs text-ink-muted">
            Las líneas casi se encíman: la diferencia máxima entre 0 % y 20 % es de {maxGap} {maxGap === 1 ? "estación" : "estaciones"}.
          </p>
        </Card>

        <Card>
          <CardHeader title="Supuestos visibles" description={`Semilla ${data.seed} · inventario del feed a las ${cdmxTime(data.inventory_snapshot_utc)} CDMX.`} />
          <ul className="divide-y divide-line px-5 pb-5 text-sm">
            {data.assumptions.map((assumption) => (
              <li key={assumption} className="py-3">{assumption}</li>
            ))}
            <li className="py-3 text-ink-muted">
              {data.stations} estaciones y {data.trips_in_window.toLocaleString("es-MX")} viajes reales del {data.date}.
            </li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Comparación de escenarios" description={recovered ? "Con bicis recuperadas antes." : "Con las bicis deshabilitadas fuera de servicio."} action={<SimulatedBadge />} />
        {Object.keys(results).length ? (
          <ComparisonTable results={results} selected={scenario} />
        ) : (
          <StateMessage kind="empty" title="Sin resultados" />
        )}
      </Card>
    </>
  );
}
