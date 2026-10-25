import type { LossRisk } from "../../../../../shared/contracts/c6_loss_risk";
import type { Priority } from "../../../../../shared/contracts/c2_priority";

export type { LossRisk, Priority };

/** De dónde salen las cifras: la foto grabada, la API en vivo o la foto cuando la API falló. */
export type Source = "grabado" | "api" | "respaldo";

export interface Validation {
  ignored: { bikes: number; gone_72h: number; rate: number };
  others: { bikes: number; gone_72h: number; rate: number };
  ratio: number;
  definition: string;
}

export interface TallerData {
  /** REAL · EJEMPLO, tal como lo reporta la API de la Línea 2. */
  mode: string;
  /** Hora CDMX de la foto, "2026-09-29T07:45". */
  at_local: string;
  ts: string;
  totals: { suspected: number; stations_flagged: number; lost_bikes: number };
  priority: Priority[];
  lossRisk: LossRisk[];
  /** Código CE normalizado → nombre de la estación. */
  names: Record<string, string>;
  validation: Validation | null;
}
