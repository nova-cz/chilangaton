"use client";

import { apiGet } from "@/lib/api";
import { config } from "@/lib/config";
import { useEffect, useState } from "react";
import snapshot from "./demo-snapshot.json";
import type { LossRisk, Priority, Source, TallerData, Validation } from "./types";

/**
 * Única puerta de datos de la Línea 2.
 * - demo: foto REAL grabada (`python -m modules.taller.export_web`), martes 29 sep 07:45 CDMX.
 * - api: FastAPI /api/v1/taller/*, con la misma hora fija `at`. Si falla se muestra la foto grabada y se avisa.
 */
const snap = snapshot as unknown as {
  _meta: { at_local: string; ts: string };
  mode: string;
  totals: TallerData["totals"];
  priority: Priority[];
  loss_risk: LossRisk[];
  names: Record<string, string>;
  validation: Validation;
};

export const RECORDED: TallerData = {
  mode: snap.mode,
  at_local: snap._meta.at_local,
  ts: snap._meta.ts,
  totals: snap.totals,
  priority: snap.priority,
  lossRisk: snap.loss_risk,
  names: snap.names,
  validation: snap.validation,
};

const at = process.env.NEXT_PUBLIC_DEMO_AT ?? RECORDED.at_local;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

async function fetchLive(): Promise<TallerData> {
  const [pr, lr, va] = await Promise.all([
    apiGet<{ mode: string; items: Priority[] }>(`/taller/priority?at=${at}&limit=1000`),
    apiGet<{ items: LossRisk[]; total_bikes: number }>(`/taller/loss-risk?at=${at}&limit=1000`),
    apiGet<Validation>("/taller/validation").catch(() => null),
  ]);
  const priority = [...pr.items].sort((a, b) => b.priority_score - a.priority_score);
  const lossRisk = [...lr.items].sort((a, b) => b.disappeared_bikes - a.disappeared_bikes);
  return {
    mode: pr.mode,
    at_local: at,
    ts: priority[0]?.ts ?? RECORDED.ts,
    totals: {
      suspected: sum(priority.map((p) => p.suspected_expected)),
      stations_flagged: priority.length,
      lost_bikes: lr.total_bikes,
    },
    priority: priority.slice(0, 25),
    lossRisk: lossRisk.slice(0, 25),
    // La API no manda nombres: se reutilizan los de la foto grabada.
    names: RECORDED.names,
    validation: va ?? RECORDED.validation,
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
