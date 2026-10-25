"use client";

import { apiGet } from "@/lib/api";
import { config } from "@/lib/config";
import { useEffect, useState } from "react";
import snapshot from "./demo-snapshot.json";
import type { LossRow, PriorityRow, Source, TallerData, Validation } from "./types";

/**
 * Única puerta de datos de /panel/taller.
 * - demo: foto grabada (`python -m modules.viaje.export_taller_demo`), martes 29 sep 7:45 CDMX.
 * - api: FastAPI /api/v1/taller/*. Si falla, se muestra la foto grabada y se avisa ("respaldo").
 */
export const RECORDED = snapshot as unknown as TallerData;

type Raw<T> = { mode: string; items: T[] };

async function fetchLive(): Promise<TallerData> {
  const [pr, lr, val, st] = await Promise.all([
    apiGet<Raw<Omit<PriorityRow, "name">>>("/taller/priority?limit=500"),
    apiGet<Raw<Omit<LossRow, "name">> & { total_bikes: number }>("/taller/loss-risk?limit=50"),
    apiGet<{ ignored: { rate: number; bikes: number }; others: { rate: number }; ratio: number; definition: string }>(
      "/taller/validation",
    ).catch(() => null),
    apiGet<{ stations: { station_id: string; name: string }[] }>("/viaje/stations").catch(() => null),
  ]);
  const names = new Map((st?.stations ?? []).map((s) => [s.station_id, s.name]));
  const name = (id: string) => names.get(id) ?? `Estación ${id}`;
  const items = [...pr.items].sort((a, b) => b.priority_score - a.priority_score);
  const validation: Validation | null = val
    ? {
        ignored_rate: val.ignored.rate,
        others_rate: val.others.rate,
        ratio: val.ratio,
        ignored_bikes: val.ignored.bikes,
        definition: val.definition,
      }
    : null;
  return {
    mode: pr.mode,
    ts: items[0]?.ts ?? null,
    totals: { stations: items.length, suspected: Math.round(items.reduce((a, p) => a + p.suspected_expected, 0)) },
    priority: items.slice(0, 50).map((p) => ({ ...p, name: name(p.station_id) })),
    loss_risk: lr.items.slice(0, 20).map((r) => ({ ...r, name: name(r.station_id) })),
    loss_total: lr.total_bikes,
    validation,
  };
}

export function useTaller(): { data: TallerData; source: Source; loading: boolean } {
  const live = config.dataMode === "api";
  const [state, setState] = useState<{ data: TallerData; source: Source; loading: boolean }>({
    data: RECORDED,
    source: "grabado",
    loading: live,
  });

  useEffect(() => {
    if (!live) return;
    let alive = true;
    fetchLive()
      .then((data) => alive && setState({ data, source: "api", loading: false }))
      .catch(() => alive && setState({ data: RECORDED, source: "respaldo", loading: false }));
    return () => {
      alive = false;
    };
  }, [live]);

  return state;
}
