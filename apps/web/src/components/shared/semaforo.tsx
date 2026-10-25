import { TONE_DOT, TONE_TEXT, type Tone } from "@/features/stations/status";
import { cn } from "@/lib/cn";

/** Semáforo con texto: el color nunca es la única señal. */
export function Semaforo({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", TONE_TEXT[tone], className)}>
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {label}
    </span>
  );
}
