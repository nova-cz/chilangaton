import { Skeleton } from "@/components/ui/state-message";
import { StationForecast } from "@/features/viaje/station-forecast";
import { ViajeShell } from "@/features/viaje/viaje-shell";
import snapshot from "@/features/viaje/demo-snapshot.json";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Estación" };

/** Prerender de las estaciones del escenario; las demás (modo api) se resuelven en el cliente. */
export function generateStaticParams() {
  return snapshot.stations.map((s) => ({ id: s.station_id }));
}

export default function EstacionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ViajeShell back="/app/viaje" backLabel="Volver al viaje">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Station params={params} />
      </Suspense>
    </ViajeShell>
  );
}

async function Station({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StationForecast id={decodeURIComponent(id)} />;
}
