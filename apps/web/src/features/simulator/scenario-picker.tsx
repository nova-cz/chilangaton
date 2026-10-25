"use client";

import { Segmented } from "@/components/ui/segmented";
import { SCENARIOS, type Scenario } from "./scenarios";

/** Selector de escenario de adopción. Se activa cuando hay resultados del motor (S3). */
export function ScenarioPicker({
  enabled = false,
  value,
  onChange,
}: {
  enabled?: boolean;
  value: Scenario;
  onChange: (value: Scenario) => void;
}) {
  return (
    <Segmented
      label="Escenario de adopción"
      value={value}
      onChange={onChange}
      options={SCENARIOS.map((s) => ({ value: s, label: `${s}%`, disabled: !enabled }))}
    />
  );
}
