import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import "./missions.css";

export type TileState = "completed" | "current" | "locked";

/** Baldosa isométrica con grosor (SVG propio). El icono va encima, centrado en la cara superior. */
export function IsoTile({ state, children, className }: { state: TileState; children?: ReactNode; className?: string }) {
  return (
    <span className={cn("relative block h-[92px] w-[104px]", className)}>
      {state === "current" ? (
        <span aria-hidden className="mission-glow absolute inset-x-1 top-3 h-12 rounded-full bg-lime-300/70 blur-xl" />
      ) : null}
      <svg viewBox="0 0 120 104" aria-hidden className={cn("iso-tile relative size-full", state)}>
        <path className="side" d="M10 40 L60 68 L110 40 L110 54 L60 82 L10 54 Z" />
        <path className="top" d="M60 12 L110 40 L60 68 L10 40 Z" />
        <path className="shine" d="M28 36 L58 21" />
      </svg>
      <span
        className={cn(
          "absolute top-[27px] left-1/2 grid size-9 -translate-x-1/2 place-items-center",
          state === "current" ? "text-brand-900" : state === "completed" ? "text-white" : "text-ink-soft/70",
        )}
      >
        {children}
      </span>
    </span>
  );
}
