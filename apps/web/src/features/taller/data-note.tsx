import { Badge, DemoBadge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import { cdmxTime } from "./format";
import type { Source, TallerData } from "./types";

/** Hora del dato y de dónde viene. Siempre visible junto a las cifras. */
export function DataNote({ data, source }: { data: TallerData; source: Source }) {
  const example = data.mode === "EJEMPLO";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
      {example || source === "respaldo" ? <DemoBadge /> : null}
      <Badge tone={data.mode === "REAL" ? "brand" : "warn"}>
        <Database aria-hidden className="size-3" />
        {data.mode === "REAL" ? "Dato real" : data.mode}
      </Badge>
      <span>
        Corte de los viajes: <strong className="font-semibold text-ink">{cdmxTime(data.ts)}</strong> (hora CDMX)
        {source === "grabado" ? " · foto grabada del historial público" : null}
        {source === "respaldo" ? " · la API no respondió, se muestra la última foto grabada" : null}
      </span>
    </div>
  );
}
