"use client";

import { SimulatedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { regresoApi, type Case, type Scenario, type ScenarioRun } from "./api";
import { STATE_LABEL } from "./case-labels";

/** R4 · Tres escenarios SIMULADOS con resultado esperado; cada uno crea un caso que se ve en la cola. */
export function ScenariosCard({ onRun }: { onRun: (item: Case) => void }) {
  const [list, setList] = useState<Scenario[] | null>(null);
  const [runs, setRuns] = useState<Record<string, ScenarioRun>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    regresoApi
      .scenarios()
      .then(setList)
      .catch(() => setList([]));
  }, []);

  const run = async (key: string) => {
    setBusy(key);
    setError(null);
    try {
      const result = await regresoApi.runScenario(key);
      setRuns((prev) => ({ ...prev, [key]: result }));
      onRun(result.case);
    } catch {
      setError("No se pudo reproducir el escenario. Revisa que la API esté corriendo.");
    } finally {
      setBusy(null);
    }
  };

  if (!list || list.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Escenarios"
        description="Los eventos por bici no son públicos: estos casos se simulan sobre estaciones reales, con resultado conocido. No cuentan en los indicadores."
        action={<SimulatedBadge />}
      />
      <ul className="grid gap-3 p-5 pt-0 md:grid-cols-3">
        {list.map((s) => {
          const result = runs[s.key];
          return (
            <li key={s.key} className="flex flex-col gap-2 rounded-3xl bg-mist-100 p-4">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-ink">{s.story}</p>
              <p className="text-sm text-ink-muted">
                Esperado: <span className="font-semibold text-ink">{STATE_LABEL[s.expected]}</span>. {s.outcome}
              </p>
              <div className="mt-auto pt-1">
                <Button variant="soft" size="sm" onClick={() => run(s.key)} disabled={busy !== null}>
                  {busy === s.key ? "Reproduciendo…" : result ? "Reproducir otra vez" : "Reproducir"}
                </Button>
              </div>
              {result ? (
                <p role="status" className="text-sm font-semibold text-ink">
                  Obtenido: {STATE_LABEL[result.obtained]} · {result.passed ? "coincide con lo esperado" : "NO coincide"}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="px-5 pb-5 text-sm font-semibold text-danger-700">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
