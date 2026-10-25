import { cn } from "@/lib/cn";
import { FlaskConical, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "brand" | "neutral" | "warn" | "danger" | "dark";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-900",
  neutral: "bg-ink/5 text-ink-muted",
  warn: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  dark: "bg-brand-900 text-white",
};

export function Badge({ tone = "brand", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Etiqueta obligatoria para datos inventados (fixtures). */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warn" className={className}>
      <Sparkles aria-hidden className="size-3" />
      Demo
    </Badge>
  );
}

/** Etiqueta obligatoria para resultados de simulación. */
export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="dark" className={className}>
      <FlaskConical aria-hidden className="size-3" />
      Simulado
    </Badge>
  );
}
