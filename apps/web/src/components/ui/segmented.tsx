"use client";

import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Control segmentado accesible (radiogroup). */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
  size = "md",
  tone = "light",
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  /** "dark": para barras oscuras, con activo en lima. */
  tone?: "light" | "dark";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full p-1", tone === "dark" ? "bg-white/10" : "bg-ink/5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-full font-semibold whitespace-nowrap transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
              tone === "dark"
                ? active
                  ? "bg-lime-300 text-brand-900"
                  : "text-white/70 hover:text-white"
                : active
                  ? "bg-white text-ink shadow-soft"
                  : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
