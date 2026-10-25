import { Logo } from "@/components/brand/logo";
import { QrInstall } from "@/components/pwa/qr-install";
import { DemoBadge } from "@/components/ui/badge";
import { ArrowUpRight, LayoutDashboard, Smartphone } from "lucide-react";
import Link from "next/link";

const SURFACES = [
  {
    href: "/app",
    title: "App ciudadana",
    text: "Estaciones, bicis y anclajes, búsqueda y misiones de rebalanceo.",
    icon: Smartphone,
    tone: "bg-brand-900 text-white",
    sub: "text-white/75",
  },
  {
    href: "/panel",
    title: "Panel operativo",
    text: "Disponibilidad, taller, incidentes, simulador y supervisión.",
    icon: LayoutDashboard,
    tone: "bg-card text-ink border border-line",
    sub: "text-ink-muted",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8 lg:py-14">
      <header className="flex items-center justify-between">
        <Logo />
        <DemoBadge />
      </header>

      <section className="mt-12 grid items-center gap-10 lg:mt-20 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-brand-600">Chilangotón 2026 · Prototipo</p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-bold tracking-tight text-balance lg:text-6xl">
            Bicis útiles, en el lugar y la hora correctos.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">
            Equilibici ayuda a encontrar bici y anclaje, y propone misiones para equilibrar las estaciones de la CDMX.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {SURFACES.map(({ href, title, text, icon: Icon, tone, sub }) => (
              <Link
                key={href}
                href={href}
                className={`group rounded-[var(--radius-card)] p-5 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 ${tone}`}
              >
                <div className="flex items-center justify-between">
                  <Icon aria-hidden className="size-6" />
                  <ArrowUpRight aria-hidden className="size-5 opacity-60 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-6 text-lg font-bold">{title}</p>
                <p className={`mt-1 text-sm ${sub}`}>{text}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center rounded-[var(--radius-sheet)] bg-brand-100 p-8">
          <p className="mb-4 text-center text-sm font-semibold text-brand-900">Escanea para abrir la app en tu celular</p>
          <QrInstall />
          <p className="mt-4 text-center text-xs text-brand-900/80">
            En iPhone: Compartir → Agregar a inicio. En Android: Instalar app.
          </p>
        </div>
      </section>

      <footer className="mt-auto pt-16 text-xs text-ink-muted">
        Proyecto independiente. No está afiliado a ECOBICI, a su operador ni a Semovi. Los datos marcados DEMO son inventados.
      </footer>
    </main>
  );
}
