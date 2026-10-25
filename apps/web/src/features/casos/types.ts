/** Tipos de modules/regreso/schemas.py (CaseOut). Sin datos de la persona: solo dónde está la bici. */
export type BikeState =
  | "en_estacion"
  | "en_viaje"
  | "traslado"
  | "taller"
  | "devolucion_en_duda"
  | "en_revision"
  | "localizada"
  | "recuperada"
  | "reincorporada";

export type IncidentType = "robo" | "perdida" | "anclaje" | "viaje_largo" | "discrepancia";

export interface CaseEvent {
  ts: string;
  from_state: BikeState | null;
  to_state: BikeState;
  actor: "app" | "sistema" | "guardian" | "operador";
  note?: string | null;
}

export interface CaseRow {
  case_id: string;
  type: IncidentType;
  source: string;
  state: BikeState;
  is_open: boolean;
  station_id: string | null;
  bike_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  history: CaseEvent[];
}

export type Source = "ejemplo" | "api" | "respaldo";
