"use client";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import type { StationDataset } from "@/features/stations/types";
import type { ViajeStation } from "@/features/viaje/types";
import { apiGet } from "@/lib/api";
import { useEffect, useState } from "react";
import { AppExperience } from "./app-experience";
import { stationDataset } from "./station-data";

/** No sustituye errores de red por estaciones inventadas. DEMO solo es explícito. */
export function AppLoader({ demo }: { demo?: StationDataset }) {
  const [data, setData] = useState<StationDataset | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (demo) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    apiGet<{ mode: string; stations: ViajeStation[] }>("/viaje/stations", { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (active) setData(stationDataset(response)); })
      .catch(() => { if (active) setError(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [demo, attempt]);

  const loaded = demo ?? data;
  if (loaded) return <AppExperience data={loaded} />;
  return (
    <main className="grid min-h-dvh place-items-center bg-surface">
      <StateMessage
        kind={error ? "error" : "loading"}
        title={error ? "No se pudieron cargar las estaciones" : "Cargando estaciones…"}
        description={error ? "Revisa la conexión con la API e inténtalo de nuevo." : "Consultando el catálogo del planeador de viajes."}
        action={error ? <Button onClick={() => { setError(false); setAttempt((n) => n + 1); }}>Reintentar</Button> : undefined}
      />
    </main>
  );
}
