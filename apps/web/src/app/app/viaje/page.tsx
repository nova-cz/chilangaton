import { Skeleton } from "@/components/ui/state-message";
import { TripPlanner } from "@/features/viaje/trip-planner";
import { ViajeShell } from "@/features/viaje/viaje-shell";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Viaje" };

export default function ViajePage() {
  return (
    <ViajeShell active="viaje">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TripPlanner />
      </Suspense>
    </ViajeShell>
  );
}
