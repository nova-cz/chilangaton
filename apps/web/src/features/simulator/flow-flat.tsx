import type { ZoneFlow } from "./flow-data";
import { project } from "./flow-data";

/** Alternativa geográfica sin WebGL, red ni animación. La tabla de flujos siempre está visible. */
export function FlowFlat({ flows }: { flows: ZoneFlow[] }) {
  const zones = new Map(flows.flatMap((f) => [[f.from, f.source], [f.to, f.target]] as const));
  return (
    <svg viewBox="0 0 680 290" role="img" aria-label="Contraflujo por zonas. Flechas de Polanco, Anzures y Reforma hacia Buenavista y San Rafael; cifras en la tabla." className="h-full w-full rounded-2xl bg-brand-100/50">
      <defs>
        <marker id="flow-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0 0 L6 3 L0 6" fill="currentColor" className="text-brand-900" />
        </marker>
      </defs>
      {flows.map((flow) => {
        const [x1, y1] = project(flow.source);
        const [x2, y2] = project(flow.target);
        return <path key={`${flow.from}-${flow.to}`} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 35} ${x2 - 9} ${y2}`} fill="none" className="stroke-brand-500" strokeWidth={1 + Math.sqrt(flow.trips)} opacity={0.7} markerEnd="url(#flow-arrow)" />;
      })}
      {[...zones].map(([name, position]) => {
        const [x, y] = project(position);
        return (
          <g key={name}>
            <circle cx={x} cy={y} r="7" className="fill-brand-900" />
            <text x={x} y={y + 24} textAnchor="middle" className="fill-brand-900 text-[13px] font-semibold">{name}</text>
          </g>
        );
      })}
      <text x="20" y="275" className="fill-ink-muted text-[11px]">Norte ↑ · Centros aproximados de zonas · Esquema 2D</text>
    </svg>
  );
}
