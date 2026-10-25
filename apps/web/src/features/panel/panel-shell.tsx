"use client";

import { Logo } from "@/components/brand/logo";
import { QrInstall } from "@/components/pwa/qr-install";
import { DemoBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { PANEL_NAV } from "@/features/navigation/routes";
import { cn } from "@/lib/cn";
import { Menu, QrCode, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/** Layout del panel operativo: sidebar responsive + header con estado DEMO y QR. */
export function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const drawerOpen = openPath === pathname; // se cierra solo al navegar

  useEffect(() => {
    if (!drawerOpen && !qrOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPath(null);
        setQrOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, qrOpen]);

  const nav = (
    <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-1">
      {PANEL_NAV.map(({ href, label, icon: Icon, owner, ready }) => {
        const active = pathname === href;
        const cls = "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors";
        return ready ? (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(cls, active ? "bg-brand-900 text-white shadow-soft" : "text-ink-muted hover:bg-ink/5 hover:text-ink")}
          >
            <Icon aria-hidden className="size-[18px]" />
            {label}
          </Link>
        ) : (
          <span key={href} aria-disabled className={cn(cls, "cursor-not-allowed text-ink-soft")}>
            <Icon aria-hidden className="size-[18px]" />
            <span className="flex-1">{label}</span>
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold">{owner}</span>
            <span className="sr-only">(próximamente)</span>
          </span>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/panel" className="px-1">
        <Logo subtitle="Panel operativo" />
      </Link>
      {nav}
      <Link href="/app" className={buttonClasses("soft", "md", "justify-center")}>
        <Smartphone aria-hidden className="size-4" /> Abrir app ciudadana
      </Link>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-card lg:block">{sidebar}</aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-ink/30" onClick={() => setOpenPath(null)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs animate-sheet-in bg-card shadow-float">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="pt-safe sticky top-0 z-30 border-b border-line/70 bg-surface/85 px-4 pb-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" onClick={() => setOpenPath(pathname)}>
              <Menu aria-hidden className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-muted">Equilibici · Panel operativo</p>
              <p className="truncate text-sm font-semibold">Corredor Buenavista–Reforma–Polanco</p>
            </div>
            <DemoBadge />
            <div className="relative">
              <Button variant="glass" size="icon" aria-label="Mostrar QR de la app" aria-expanded={qrOpen} onClick={() => setQrOpen((v) => !v)}>
                {qrOpen ? <X aria-hidden className="size-5" /> : <QrCode aria-hidden className="size-5" />}
              </Button>
              {qrOpen ? (
                <div className="glass absolute top-14 right-0 z-40 w-64 animate-fade-in rounded-3xl p-4">
                  <p className="mb-3 text-center text-sm font-semibold">Abre la app en tu celular</p>
                  <QrInstall />
                </div>
              ) : null}
            </div>
          </div>
          <p role="status" className="mt-2 rounded-xl bg-warning-100 px-3 py-1.5 text-xs font-medium text-warning-700">
            Modo DEMO: este panel aún no muestra datos reales. Cada módulo se conecta al corte A con su contrato.
          </p>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
