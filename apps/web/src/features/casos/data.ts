"use client";

import { apiGet } from "@/lib/api";
import { config } from "@/lib/config";
import { useEffect, useState } from "react";
import type { CaseRow, Source } from "./types";

export interface CasosData {
  cases: CaseRow[];
  names: Record<string, string>;
}

/** Casos de EJEMPLO para el modo demo: se muestran siempre con la etiqueta DEMO. No son casos reales. */
const D = (h: number, m: number) => `2026-09-29T${String(h + 6).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+00:00`;
export const EXAMPLE: CasosData = {
  names: { "271-272": "Jesús García - Carlos J. Meneses", "261": "Paseo de la Reforma-Río de la Plata", "14": "Reforma - Río de Plata" },
  cases: [
    {
      case_id: "ejemplo-0004", type: "anclaje", source: "app", state: "devolucion_en_duda", is_open: true, station_id: "261",
      bike_id: null, assigned_to: null, created_at: D(8, 10), updated_at: D(8, 12),
      history: [{ ts: D(8, 10), from_state: null, to_state: "devolucion_en_duda", actor: "app", note: "Anclé y no se registró" }],
    },
    {
      case_id: "ejemplo-0003", type: "viaje_largo", source: "sistema", state: "en_revision", is_open: true, station_id: "271-272",
      bike_id: null, assigned_to: "guardian-02", created_at: D(7, 20), updated_at: D(7, 55),
      history: [
        { ts: D(7, 20), from_state: null, to_state: "en_viaje", actor: "sistema", note: "Nadie respondió el ¿Todo bien? de los 90 min" },
        { ts: D(7, 55), from_state: "en_viaje", to_state: "en_revision", actor: "operador", note: "Un guardián la va a buscar" },
      ],
    },
    {
      case_id: "ejemplo-0002", type: "perdida", source: "app", state: "localizada", is_open: true, station_id: "14",
      bike_id: null, assigned_to: "guardian-01", created_at: D(6, 40), updated_at: D(7, 30),
      history: [
        { ts: D(6, 40), from_state: null, to_state: "en_revision", actor: "app", note: "No sé dónde quedó la bici" },
        { ts: D(7, 30), from_state: "en_revision", to_state: "localizada", actor: "guardian", note: "Encontrada a una cuadra de la estación" },
      ],
    },
    {
      case_id: "ejemplo-0001", type: "anclaje", source: "app", state: "reincorporada", is_open: false, station_id: "14",
      bike_id: null, assigned_to: null, created_at: D(6, 5), updated_at: D(6, 25),
      history: [
        { ts: D(6, 5), from_state: null, to_state: "devolucion_en_duda", actor: "app", note: "Anclé y no se registró" },
        { ts: D(6, 25), from_state: "devolucion_en_duda", to_state: "reincorporada", actor: "sistema", note: "El feed ya muestra la bici anclada" },
      ],
    },
  ],
};

async function fetchLive(): Promise<CasosData> {
  const [cases, stations] = await Promise.all([
    apiGet<CaseRow[]>("/cases"),
    apiGet<{ station_id: string; name: string }[]>("/returns/stations").catch(() => []),
  ]);
  return { cases, names: Object.fromEntries(stations.map((s) => [s.station_id, s.name])) };
}

export function useCasos(): { data: CasosData; source: Source; loading: boolean } {
  const live = config.dataMode === "api";
  const [state, setState] = useState<{ data: CasosData; source: Source; loading: boolean }>({
    data: EXAMPLE,
    source: "ejemplo",
    loading: live,
  });

  useEffect(() => {
    if (!live) return;
    let alive = true;
    fetchLive()
      .then((data) => alive && setState({ data, source: "api", loading: false }))
      .catch(() => alive && setState({ data: EXAMPLE, source: "respaldo", loading: false }));
    return () => {
      alive = false;
    };
  }, [live]);

  return state;
}
