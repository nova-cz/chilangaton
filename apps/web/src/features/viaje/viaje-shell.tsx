import { Logo } from "@/components/brand/logo";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { isExampleMode } from "./format";

/** Marco común de /app/viaje, /app/estacion/[id] y /app/ajustes. */
export function ViajeShell({
  back = "/app",
  backLabel = "Volver al mapa",
  active,
  children,
}: {
  back?: string;
  backLabel?: string;
  active?: "viaje" | "ajustes";
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="pt-safe sticky top-0 z-30 px-3 lg:px-6">
        <div className="glass mx-auto mt-2 flex h-14 max-w-5xl items-center justify-between gap-2 rounded-full pr-1.5 pl-1.5">
          <div className="flex min-w-0 items-center gap-1">
            <Link href={back} aria-label={backLabel} className={buttonClasses("ghost", "icon", "size-10")}>
              <ArrowLeft aria-hidden className="size-5" />
            </Link>
            <Logo className="[&_span_span:last-child]:hidden sm:[&_span_span:last-child]:block" subtitle="Bicis útiles, a tiempo" />
          </div>
          <nav aria-label="Secciones de viaje" className="flex items-center gap-1 rounded-full bg-ink/5 p-1">
            {(
              [
                ["viaje", "/app/viaje", "Viaje"],
                ["ajustes", "/app/ajustes", "Ajustes"],
              ] as const
            ).map(([key, href, label]) => (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? "page" : undefined}
                className={cn(
                  "grid h-9 place-items-center rounded-full px-3.5 text-sm font-semibold transition-colors",
                  active === key ? "bg-brand-900 text-white" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-5 pb-16 lg:px-6">{children}</main>
    </div>
  );
}

/** Origen de los datos, decidido por el motor. EJEMPLO → DemoBadge (regla de honestidad). */
export function ModeBadge({ mode, className }: { mode: string; className?: string }) {
  if (isExampleMode(mode)) return <DemoBadge className={className} />;
  return (
    <Badge tone="brand" className={className}>
      <Radio aria-hidden className="size-3" />
      {mode.startsWith("VIVO") ? "En vivo" : "Datos reales"}
    </Badge>
  );
}
