import { Badge, DemoBadge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import { cdmxTime } from "./format";
import type { BiciUtilData, Source } from "./types";

/** Hora del dato y de dónde viene. Siempre visible junto a las cifras. */
export function DataNote({ data, source }: { data: BiciUtilData; source: Source }) {
  const ts = data.stations[0]?.ts ?? data.clock.ts;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
      {source === "respaldo" ? <DemoBadge /> : null}
      <Badge tone={data.mode === "REAL" ? "brand" : "warn"}>
        <Database aria-hidden className="size-3" />
        {data.mode === "REAL" ? "Dato real" : data.mode}
      </Badge>
      <span>
        Foto del feed: <strong className="font-semibold text-ink">{cdmxTime(ts)}</strong> (hora CDMX)
        {source === "grabado" ? " · grabada del historial público" : null}
        {source === "respaldo" ? " · la API no respondió, se muestra la última foto grabada" : null}
      </span>
      {data.c2_mode !== "REAL" ? (
        <Badge tone="neutral">Sospechosas (Línea 2): {data.c2_mode === "PENDIENTE" ? "aún no se descuentan" : "de ejemplo"}</Badge>
      ) : null}
    </div>
  );
}
