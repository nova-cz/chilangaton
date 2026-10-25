"use client";

import { cn } from "@/lib/cn";

/** Interruptor accesible: "bicis recuperadas antes" (las deshabilitadas vuelven a servicio a las 7:00). */
export function RecoveredToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-full py-1 pr-1 text-left text-sm font-semibold"
    >
      <span>Bicis recuperadas antes</span>
      <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-brand-500" : "bg-ink/15")}>
        <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow-soft transition-transform duration-200", checked && "translate-x-5")} />
      </span>
    </button>
  );
}
