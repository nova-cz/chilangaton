import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/state-message";
import { DENUNCIA_DIGITAL_URL, ECOBICI_PHONE, EMERGENCIAS } from "@/features/regreso/channels";
import { HelpForm } from "@/features/regreso/help-form";
import { cn } from "@/lib/cn";
import { ArrowLeft, ExternalLink, Phone, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Ayuda" };

/** R3 · Robo, pérdida y anclaje. Lo urgente (911) va en el HTML inicial, antes de que cargue JavaScript. */
export default function AyudaPage() {
  return (
    <main className="pt-safe pb-safe mx-auto min-h-dvh max-w-xl space-y-4 bg-surface px-4">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/app" aria-label="Volver a estaciones" className={buttonClasses("glass", "icon")}>
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ayuda</h1>
          <p className="text-sm text-ink-muted">Robo, pérdida o un anclaje que no se registró</p>
        </div>
      </header>

      <Card className="border-danger-100 bg-danger-100 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-danger-700">
          <Siren aria-hidden className="size-5" />
          ¿Estás en peligro o el robo acaba de pasar?
        </h2>
        <p className="mt-1 text-sm text-ink">
          Primero ponte a salvo. No persigas a nadie ni intentes recuperar la bici por tu cuenta.
        </p>
        <a href={`tel:${EMERGENCIAS.tel}`} className={cn(buttonClasses("dark"), "mt-3 w-full justify-center")}>
          <Phone aria-hidden className="size-4" />
          Llamar al {EMERGENCIAS.label}
        </a>
      </Card>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <HelpForm />
      </Suspense>

      <Card className="p-5">
        <h2 className="font-semibold">Si fue un robo, denúncialo</h2>
        <p className="mt-1 text-sm text-ink-muted">
          La denuncia ante la Fiscalía de la CDMX deja constancia oficial. Ten a la mano la estación, la hora y la
          matrícula de la bici.
        </p>
        <a
          href={DENUNCIA_DIGITAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonClasses("soft"), "mt-3 w-full justify-center")}
        >
          Denuncia digital de la Fiscalía
          <ExternalLink aria-hidden className="size-4" />
          <span className="sr-only">(abre en otra pestaña)</span>
        </a>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">¿Prefieres llamar a ECOBICI?</h2>
        <a href={`tel:${ECOBICI_PHONE.tel}`} className={cn(buttonClasses("soft"), "mt-3 w-full justify-center")}>
          <Phone aria-hidden className="size-4" />
          {ECOBICI_PHONE.label}
        </a>
      </Card>

      <p className="px-1 pb-4 text-xs text-ink-muted">
        Equilibici es un proyecto independiente y no forma parte de ECOBICI: no cierra viajes ni levanta reportes por
        ti. Tu mensaje se arma en tu teléfono y tú decides a quién enviarlo; no lo guardamos.
      </p>
    </main>
  );
}
