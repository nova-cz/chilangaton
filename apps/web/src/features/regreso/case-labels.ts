import type { Actor, BikeState, IncidentType } from "./api";

/** Textos del estado de la bici: dicen dónde está, nunca quién la tiene. */
export const STATE_LABEL: Record<BikeState, string> = {
  en_estacion: "En estación",
  en_viaje: "En viaje",
  traslado: "En traslado",
  taller: "En taller",
  devolucion_en_duda: "Devolución en duda",
  en_revision: "En revisión",
  localizada: "Localizada",
  recuperada: "Recuperada",
  reincorporada: "Reincorporada",
};

/** Verbo del botón que mueve el caso a ese estado. */
export const MOVE_LABEL: Record<BikeState, string> = {
  en_estacion: "Está en una estación",
  en_viaje: "Sigue en viaje",
  traslado: "La trasladó el operador",
  taller: "Mandar a taller",
  devolucion_en_duda: "Devolución en duda",
  en_revision: "Poner en revisión",
  localizada: "Marcar localizada",
  recuperada: "Marcar recuperada",
  reincorporada: "Reincorporar al servicio",
};

export const TYPE_LABEL: Record<IncidentType, string> = {
  robo: "Robo",
  perdida: "Pérdida",
  anclaje: "Anclaje no registrado",
  viaje_largo: "Viaje largo",
  discrepancia: "Discrepancia",
};

export const ACTOR_LABEL: Record<Actor, string> = {
  app: "App",
  sistema: "Sistema",
  guardian: "Guardián",
  operador: "Operador",
};

export type BadgeTone = "brand" | "neutral" | "warn" | "danger" | "dark";

export const STATE_TONE: Record<BikeState, BadgeTone> = {
  en_estacion: "brand",
  reincorporada: "brand",
  recuperada: "brand",
  localizada: "dark",
  en_revision: "warn",
  devolucion_en_duda: "warn",
  en_viaje: "neutral",
  traslado: "neutral",
  taller: "neutral",
};
