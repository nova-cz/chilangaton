import type { BikeState, CaseEvent, IncidentType } from "./types";

export const TYPE_LABEL: Record<IncidentType, string> = {
  robo: "Robo reportado",
  perdida: "Pérdida",
  anclaje: "Anclaje que no se registró",
  viaje_largo: "Viaje muy largo",
  discrepancia: "Bici que se movió sin viaje",
};

export const STATE_LABEL: Record<BikeState, string> = {
  en_estacion: "De vuelta en estación",
  en_viaje: "En viaje",
  traslado: "En traslado",
  taller: "En taller",
  devolucion_en_duda: "Devolución en duda",
  en_revision: "En revisión",
  localizada: "Localizada",
  recuperada: "Recuperada",
  reincorporada: "Reincorporada al servicio",
};

export const ACTOR_LABEL: Record<CaseEvent["actor"], string> = {
  app: "La persona usuaria",
  sistema: "El sistema",
  guardian: "Guardián",
  operador: "Operación",
};
