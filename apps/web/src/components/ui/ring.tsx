import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Anillo de progreso (0–1) con contenido al centro. Decorativo: el valor va en texto. */
export function Ring({
  value,
  size = 72,
  stroke = 6,
  className,
  trackClass = "text-ink/10",
  barClass = "text-brand-500",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClass?: string;
  barClass?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn("transition-[stroke-dashoffset] duration-700", barClass)}
        />
      </svg>
      <div className="relative text-center leading-none">{children}</div>
    </div>
  );
}

/** Número grande con unidad pequeña: 12 km, 34 bicis. */
export function Metric({ value, unit, className }: { value: ReactNode; unit?: string; className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight tabular-nums", className)}>
      {value}
      {unit ? <span className="ml-0.5 text-[0.45em] font-semibold opacity-70">{unit}</span> : null}
    </span>
  );
}
