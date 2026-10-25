import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/state-message";
import { AnclajeFlow } from "@/features/regreso/anclaje-flow";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Anclé aquí" };

/** R2 · "Anclé aquí". Acepta ?estacion=<station_id> para llegar con la estación elegida. */
export default function AnclajePage() {
  return (
    <main className="pt-safe pb-safe mx-auto min-h-dvh max-w-xl space-y-4 bg-surface px-4">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/app" aria-label="Volver a estaciones" className={buttonClasses("glass", "icon")}>
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anclé aquí</h1>
          <p className="text-sm text-ink-muted">Revisamos si la estación registró tu bici</p>
        </div>
      </header>

      <Suspense fallback={<Skeleton className="h-72" />}>
        <AnclajeFlow />
      </Suspense>

      <p className="px-1 pb-4 text-xs text-ink-muted">
        Usamos el estado público de las estaciones de ECOBICI. Equilibici no forma parte de ECOBICI y no cierra viajes:
        la confirmación oficial solo llega en su app.
      </p>
    </main>
  );
}
