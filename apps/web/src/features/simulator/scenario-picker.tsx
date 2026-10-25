"use client";

import { Segmented } from "@/components/ui/segmented";
import { useState } from "react";
import { SCENARIOS, type Scenario } from "./scenarios";

/** Selector de escenario de adopción. `enabled` se activa cuando existan resultados de S3. */
export function ScenarioPicker({ enabled = false }: { enabled?: boolean }) {
  const [scenario, setScenario] = useState<Scenario>(10);
  return (
    <Segmented
      label="Escenario de adopción"
      value={scenario}
      onChange={setScenario}
      options={SCENARIOS.map((s) => ({ value: s, label: `${s}%`, disabled: !enabled }))}
    />
  );
}
