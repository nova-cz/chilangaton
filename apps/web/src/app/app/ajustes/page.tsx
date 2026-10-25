import { TripSettings } from "@/features/viaje/trip-settings";
import { ViajeShell } from "@/features/viaje/viaje-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <ViajeShell active="ajustes" back="/app/viaje" backLabel="Volver al viaje">
      <TripSettings />
    </ViajeShell>
  );
}
