import { cn } from "@/lib/cn";
import "./missions.css";

/** Cofre SVG propio. Bloqueado: en grises; listo: dorado con vaivén suave. */
export function Chest({ unlocked, className }: { unlocked: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 96 84" aria-hidden className={cn("h-[76px] w-[88px]", unlocked ? "mission-sparkle" : "grayscale", !unlocked && "opacity-60", className)}>
      <ellipse cx="48" cy="76" rx="38" ry="6" className="fill-ink/10" />
      <rect x="12" y="34" width="72" height="38" rx="8" className="fill-warning-500" />
      <rect x="12" y="34" width="72" height="12" className="fill-warning-700/25" />
      <path d="M12 38 Q12 12 48 12 Q84 12 84 38 Z" className="fill-[#f5c26b]" />
      <rect x="12" y="34" width="72" height="6" className="fill-warning-700" />
      <rect x="26" y="14" width="8" height="58" rx="3" className="fill-warning-700/70" />
      <rect x="62" y="14" width="8" height="58" rx="3" className="fill-warning-700/70" />
      <rect x="40" y="30" width="16" height="18" rx="4" className="fill-lime-300 stroke-warning-700" strokeWidth="3" />
      <circle cx="48" cy="38" r="2.6" className="fill-warning-700" />
    </svg>
  );
}
