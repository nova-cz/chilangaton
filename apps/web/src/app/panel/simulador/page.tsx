import { SimulatedBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { ScenarioPicker } from "@/features/simulator/scenario-picker";
import { SCENARIOS } from "@/features/simulator/scenarios";
import { Globe2, LineChart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Simulador" };

/**
 * /panel/simulador (Línea 4 · S4). Estructura lista; los resultados llegan del motor S3 vía
 * GET /api/v1/simulation/results?scenario=… No se muestran cifras hasta que existan.
 */
const ASSUMPTIONS = [
  { label: "Día de referencia", value: "Martes real, 7:00–10:00 (propuesto: 29 sep 2026)" },
  { label: "Corredor", value: "Buenavista – San Rafael – Reforma – Anzures – Polanco" },
  { label: "Adopción", value: "0, 5, 10 y 20% de los viajes elegibles" },
  { label: "Segundo control", value: "Bicis recuperadas antes (taller)" },
  { label: "Reproducibilidad", value: "Semilla fija: misma semilla, mismo resultado" },
  { label: "Inventario inicial", value: "Historial del feed (UTC) · pendiente de S3" },
];

const METRICS = ["Horas estación vacía", "Horas estación llena", "Bicis movidas por misiones"];

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
            Repite una mañana real con y sin Equilibici. Todo resultado de esta pantalla es simulado y se etiqueta así.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ScenarioPicker />
          <p className="text-xs text-ink-muted">Se habilita cuando el motor (S3) publique resultados</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Escenarios de adopción" description="Horas estación-vacía y estación-llena por escenario." action={<SimulatedBadge />} />
          <div className="relative mx-5 mb-5 h-72 overflow-hidden rounded-2xl bg-surface">
            <svg aria-hidden className="absolute inset-0 h-full w-full text-line" preserveAspectRatio="none">
              {[20, 40, 60, 80].map((y) => (
                <line key={y} x1="0" x2="100%" y1={`${y}%`} y2={`${y}%`} stroke="currentColor" strokeDasharray="4 6" />
              ))}
            </svg>
            <StateMessage
              className="relative h-full"
              kind="empty"
              title="Sin resultados todavía"
              description="La gráfica se llenará con GET /api/v1/simulation/results. No mostramos cifras de relleno."
            />
          </div>
          <div className="flex items-center gap-2 px-5 pb-5 text-xs text-ink-muted">
            <LineChart aria-hidden className="size-4" /> Eje X: hora (7:00–10:00, CDMX) · Eje Y: estaciones sin servicio
          </div>
        </Card>

        <Card>
          <CardHeader title="Supuestos visibles" description="Se muestran junto a cualquier resultado." />
          <dl className="divide-y divide-line px-5 pb-5">
            {ASSUMPTIONS.map(({ label, value }) => (
              <div key={label} className="py-3">
                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Comparación de escenarios" action={<SimulatedBadge />} />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="sr-only">Métricas por escenario de adopción (sin datos todavía)</caption>
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th scope="col" className="py-2 font-semibold">Métrica</th>
                  {SCENARIOS.map((s) => (
                    <th key={s} scope="col" className="py-2 text-right font-semibold">{s}%</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {METRICS.map((metric) => (
                  <tr key={metric}>
                    <th scope="row" className="py-3 text-left font-medium">{metric}</th>
                    {SCENARIOS.map((s) => (
                      <td key={s} className="py-3 text-right text-ink-soft" aria-label="Sin datos">—</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Flujos de la mañana" description="Arcos 3D con deck.gl (S6); versión 2D si no hay WebGL." action={<SimulatedBadge />} />
          <div className="mx-5 mb-5 grid h-56 place-items-center rounded-2xl bg-brand-900 text-white">
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <Globe2 aria-hidden className="size-8 text-brand-300" />
              <p className="font-semibold">Visualización geográfica pendiente</p>
              <p className="text-sm text-white/70">Misiones y déficit de Buenavista animados sobre el mapa del corredor.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
