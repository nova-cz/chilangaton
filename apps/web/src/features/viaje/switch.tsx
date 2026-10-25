"use client";

import { cn } from "@/lib/cn";
import { useId, type ReactNode } from "react";

/** Interruptor accesible (role="switch") con etiqueta y descripción. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3 py-3.5", disabled && "opacity-50")}>
      {icon ? <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block font-semibold text-ink">
          {label}
        </label>
        {description ? <p id={`${id}-d`} className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          checked ? "bg-brand-900" : "bg-ink/15",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full shadow-soft transition-transform duration-200",
            checked ? "translate-x-5 bg-lime-300" : "bg-white",
          )}
        />
      </button>
    </div>
  );
}
