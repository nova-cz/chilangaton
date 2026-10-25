import { SimulatedBadge } from "@/components/ui/badge";
import { ContraflujoCard } from "@/features/simulator/contraflujo-card";
import { SimulatorView } from "@/features/simulator/simulator-view";
import type { ContraflujoResult, SimulationResults } from "@/features/simulator/types";
import type { Metadata } from "next";
import contraflujo from "../../../../../../modules/distribucion/fixtures/contraflujo.json";
import simulation from "../../../../../../modules/distribucion/fixtures/simulation_results.json";

export const metadata: Metadata = { title: "Simulador" };

/**
 * /panel/simulador (Línea 4 · S4). Lee los JSON generados offline por modules/distribucion (engine.py y
 * contraflujo.py), los mismos que sirve la API en GET /api/v1/simulation/results y /contraflujo.
 */
export default function SimuladorPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Simulador del corredor</h1>
            <SimulatedBadge />
          </div>
          <p className="mt-1 max-w-2xl text-ink-muted">
            Repite el martes 29 de septiembre, de 7:00 a 10:00, con y sin Equilibici. Los resultados de simulación se etiquetan así; el contraflujo es dato real.
          </p>
        </div>
      </div>

      <SimulatorView data={simulation as unknown as SimulationResults} contraflujo={contraflujo as unknown as ContraflujoResult} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ContraflujoCard data={contraflujo as unknown as ContraflujoResult} />

      </div>
    </div>
  );
}
