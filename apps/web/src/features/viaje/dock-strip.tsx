import { cn } from "@/lib/cn";
import { pct } from "./format";

/**
 * La probabilidad contada como lo que es: veces de cada 10.
 * Diez anclajes, como en la estación; los llenos son las mañanas en que sí hubo bici (o lugar).
 * Decorativo para lectores de pantalla: el texto de al lado dice lo mismo.
 */
export function DockStrip({
  p,
  kind,
  tone = "light",
  size = "md",
  className,
}: {
  p: number;
  kind: "bike" | "dock";
  tone?: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
}) {
  const filled = timesOutOfTen(p);
  const on =
    tone === "dark" ? "bg-lime-300" : kind === "bike" ? "bg-brand-500" : "bg-brand-900";
  const off = tone === "dark" ? "bg-white/12 ring-1 ring-white/15 ring-inset" : "bg-white ring-1 ring-ink/10 ring-inset";
  return (
    <div aria-hidden className={cn("flex items-end gap-[3px]", className)}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-t-[6px] rounded-b-[3px] transition-colors duration-500",
            size === "sm" ? "h-4" : "h-7",
            i < filled ? on : off,
          )}
          style={{ transitionDelay: `${i * 35}ms` }}
        />
      ))}
    </div>
  );
}

/** 99% no es "10 de 10": mientras no sea seguro, como máximo 9 (y como mínimo 1 si hay alguna opción). */
export function timesOutOfTen(p: number): number {
  const v = pct(p);
  return v === 0 ? 0 : Math.min(9, Math.max(1, Math.round(v / 10)));
}
