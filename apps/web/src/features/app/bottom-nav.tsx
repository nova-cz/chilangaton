"use client";

import { APP_TABS } from "@/features/navigation/routes";
import { cn } from "@/lib/cn";
import Link from "next/link";

export type AppView = "map" | "list" | "missions";

/** Navegación inferior (móvil). Las rutas de otras líneas aparecen deshabilitadas hasta que existan. */
export function BottomNav({ view, onView }: { view: AppView; onView: (view: AppView) => void }) {
  return (
    <nav aria-label="Navegación principal" className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 lg:hidden">
      <ul className="glass pointer-events-auto mx-auto flex max-w-md items-stretch justify-between rounded-[1.75rem] p-1.5">
        {APP_TABS.map((tab) => {
          const Icon = tab.icon;
          const base = "flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-[1.4rem] text-[11px] font-semibold transition-colors";
          if ("view" in tab) {
            const active = tab.view === view;
            return (
              <li key={tab.key} className="flex-1">
                <button
                  type="button"
                  onClick={() => onView(tab.view)}
                  aria-current={active ? "page" : undefined}
                  className={cn(base, active ? "bg-brand-900 text-white" : "text-ink-muted hover:text-ink")}
                >
                  <Icon aria-hidden className="size-5" />
                  {tab.label}
                </button>
              </li>
            );
          }
          return (
            <li key={tab.key} className="flex-1">
              {tab.ready ? (
                <Link href={tab.href} className={cn(base, "text-ink-muted hover:text-ink")}>
                  <Icon aria-hidden className="size-5" />
                  {tab.label}
                </Link>
              ) : (
                <span aria-disabled className={cn(base, "cursor-not-allowed text-ink-soft/70")} title={`Próximamente · ${tab.owner}`}>
                  <Icon aria-hidden className="size-5" />
                  {tab.label}
                  <span className="sr-only">(próximamente)</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
