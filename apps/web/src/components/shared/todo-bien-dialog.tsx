"use client";

import { buttonClasses } from "@/components/ui/button";
import { helpHref } from "@/features/regreso/channels";
import { cn } from "@/lib/cn";
import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { speak, vibrate } from "./announce";

/**
 * "¿Todo bien?" de Regreso Seguro. La Línea 3 lo abre a los 45 y 90 min del contador de viaje.
 * Usa <dialog> nativo: atrapa el foco, cierra con Esc y el lector lo anuncia como diálogo.
 *
 * <TodoBienDialog open={min >= 45} minutes={min} station="CE-014" onClose={...} onFindDock={...} />
 */
export function TodoBienDialog({
  open,
  minutes,
  station,
  bikeId,
  onClose,
  onFindDock,
}: {
  open: boolean;
  minutes: number;
  station?: string;
  bikeId?: string;
  onClose: () => void;
  /** Si existe, muestra "No encuentro dónde anclar" (la Línea 3 enseña la alternativa). */
  onFindDock?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      vibrate();
      speak(`¿Todo bien? Llevas ${minutes} minutos de viaje.`);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, minutes]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={textId}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--radius-sheet)] bg-card p-6 text-ink shadow-float backdrop:bg-brand-900/50"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-lime-100 text-brand-700">
        <HeartHandshake aria-hidden className="size-6" />
      </span>
      <h2 id={titleId} className="mt-3 text-xl font-bold tracking-tight">
        ¿Todo bien?
      </h2>
      <p id={textId} className="mt-1 text-[15px] text-ink-muted">
        Llevas {minutes} minutos de viaje.
        {minutes >= 45 ? " Después de 45 minutos ECOBICI cobra tiempo extra." : null}
      </p>

      <div className="mt-5 grid gap-2">
        <button type="button" autoFocus onClick={() => ref.current?.close()} className={cn(buttonClasses("dark"), "justify-center")}>
          Todo bien, sigo mi viaje
        </button>
        {onFindDock ? (
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              onFindDock();
            }}
            className={cn(buttonClasses("lime"), "justify-center")}
          >
            No encuentro dónde anclar
          </button>
        ) : null}
        <Link href={helpHref({ kind: "anclaje", station, bikeId })} className={cn(buttonClasses("soft"), "justify-center")}>
          Ya anclé y no se registró
        </Link>
        <Link href={helpHref({ kind: "robo", station, bikeId })} className={cn(buttonClasses("soft"), "justify-center")}>
          Me robaron la bici o tuve un problema
        </Link>
      </div>
    </dialog>
  );
}
