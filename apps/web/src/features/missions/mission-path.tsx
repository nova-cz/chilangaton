import { cn } from "@/lib/cn";
import { Bike, Check, Lock } from "lucide-react";
import Link from "next/link";
import { Chest } from "./chest";
import { IsoTile } from "./iso-tile";
import type { PathNode } from "./types";

/** Desplazamiento horizontal en zigzag (px) según la posición en el camino. */
const zigzag = (i: number) => Math.round(Math.sin(i * 0.95) * 64);

/** Camino vertical de misiones: completadas, actual (brilla y rebota) y bloqueadas. */
export function MissionPath({ nodes }: { nodes: PathNode[] }) {
  return (
    <ol aria-label="Camino de misiones" className="mx-auto max-w-md pb-6">
      {nodes.map((node, i) => (
        <li key={node.kind === "mission" ? node.mission.id : node.id} className="flex h-[118px] justify-center">
          <div className="relative self-center" style={{ transform: `translateX(${zigzag(i)}px)` }}>
            {node.kind === "chest" ? <ChestNode unlocked={node.unlocked} /> : <MissionNode node={node} />}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChestNode({ unlocked }: { unlocked: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Chest unlocked={unlocked} />
      <span className={cn("mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", unlocked ? "bg-warning-100 text-warning-700" : "bg-ink/5 text-ink-muted")}>
        {unlocked ? "Cofre virtual listo (DEMO)" : "Cofre: completa 3 misiones"}
      </span>
    </div>
  );
}

function MissionNode({ node }: { node: Extract<PathNode, { kind: "mission" }> }) {
  const { mission, index, current } = node;
  const locked = mission.state === "locked";
  const state = current ? "current" : locked ? "locked" : "completed";
  const Icon = locked ? Lock : current ? Bike : Check;
  const label = `Misión ${index + 1}: ${mission.title}. ${locked ? "Bloqueada" : current ? "Disponible" : "Completada"}.`;

  const tile = (
    <span className={cn("block", current && "mission-bob")}>
      <IsoTile state={state}>
        <Icon aria-hidden className="size-6" strokeWidth={2.75} />
      </IsoTile>
    </span>
  );

  return (
    <div className="flex flex-col items-center">
      {current ? (
        <span className="relative mb-1 rounded-2xl bg-brand-900 px-3 py-1.5 text-xs font-bold text-white">
          Empezar
          <span aria-hidden className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-brand-900" />
        </span>
      ) : null}
      {locked ? (
        <span aria-label={label} role="img" className="cursor-not-allowed">
          {tile}
        </span>
      ) : (
        <Link href={`/app/mision/${mission.id}`} aria-label={label} className="rounded-3xl transition-transform active:scale-95">
          {tile}
        </Link>
      )}
    </div>
  );
}
