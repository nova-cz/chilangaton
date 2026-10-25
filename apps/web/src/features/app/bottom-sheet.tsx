"use client";

import { cn } from "@/lib/cn";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

export type SheetSnap = "compact" | "expanded";

/** Bottom sheet arrastrable con dos alturas. Los controles del mapa viajan pegados a su borde superior. */
export function BottomSheet({
  snap,
  onSnap,
  peek,
  label,
  controls,
  children,
}: {
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  /** Altura visible en modo compacto, en px. */
  peek: number;
  label: string;
  /** Botones flotantes sobre el borde superior (2D/3D, recentrar). */
  controls?: ReactNode;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; velocity: number; range: number; moved: boolean } | null>(null);
  const [dy, setDy] = useState<number | null>(null);

  const expanded = snap === "expanded";
  const base = expanded ? "0px" : `calc(100% - ${peek}px)`;

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const height = sheetRef.current?.offsetHeight ?? 0;
    drag.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      range: Math.max(height - peek, 0),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = event.clientY - d.startY;
    if (Math.abs(delta) > 4) d.moved = true;
    const dt = Math.max(event.timeStamp - d.lastT, 1);
    d.velocity = (event.clientY - d.lastY) / dt;
    d.lastY = event.clientY;
    d.lastT = event.timeStamp;
    // Resistencia al pasar los límites.
    const min = expanded ? 0 : -d.range;
    const max = expanded ? d.range : 0;
    const clamped = delta < min ? min + (delta - min) * 0.15 : delta > max ? max + (delta - max) * 0.15 : delta;
    setDy(clamped);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!d.moved) {
      setDy(null);
      onSnap(expanded ? "compact" : "expanded");
      return;
    }
    const position = (expanded ? 0 : d.range) + (event.clientY - d.startY); // 0 = abierto, range = compacto
    const flick = Math.abs(d.velocity) > 0.45;
    const next: SheetSnap = flick ? (d.velocity < 0 ? "expanded" : "compact") : position < d.range / 2 ? "expanded" : "compact";
    setDy(null);
    onSnap(next);
  };

  return (
    // El contenedor recorta el sheet justo encima de la navegación inferior.
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+84px)] z-20 overflow-hidden px-3 lg:hidden">
    <aside
      ref={sheetRef}
      aria-label={label}
      className={cn(
        "pointer-events-auto absolute inset-x-3 bottom-0 mx-auto flex h-[min(calc(100%-188px),640px)] max-w-md flex-col",
        dy === null && "transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
      )}
      style={{ transform: `translateY(calc(${base} + ${dy ?? 0}px))` }}
    >
      {controls ? (
        <div
          className={cn(
            "absolute -top-14 right-0 flex gap-2 transition-opacity duration-200",
            expanded ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          {controls}
        </div>
      ) : null}
      <div className="opaque-pane flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem]">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Contraer panel" : "Expandir panel"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDy(null);
          }}
          className="grid h-7 w-full shrink-0 cursor-grab touch-none place-items-center active:cursor-grabbing"
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-ink/15" />
        </button>
        <div className={cn("min-h-0 flex-1 px-4 pb-4", expanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden")}>{children}</div>
      </div>
    </aside>
    </div>
  );
}
