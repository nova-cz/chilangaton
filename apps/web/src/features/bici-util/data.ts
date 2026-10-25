"use client";

import { apiGet } from "@/lib/api";
import { config } from "@/lib/config";
import { useEffect, useState } from "react";
import snapshot from "./demo-snapshot.json";
import type { BiciUtilData, BiciUtilStation, Clock, Contract, HourPoint, Source } from "./types";

/**
 * Única puerta de datos de la Línea 1.
 * - demo: foto REAL grabada del feed (`python -m modules.bici_util.export_demo`), martes 29 sep 08:00 CDMX.
 * - api: FastAPI /api/v1/bici-util/*, con la misma hora fija `at` para que la historia cuadre.
 *   Si la API falla se muestra la foto grabada y se avisa ("respaldo").
 */
const snap = snapshot as unknown as {
  _meta: { at_local: string };
  mode: string;
  c2_mode: string;
  stations: BiciUtilStation[];
  hourly: HourPoint[];
  clock: Clock;
  contract: Contract;
};

export const RECORDED: BiciUtilData = {
  mode: snap.mode,
  c2_mode: snap.c2_mode,
  at_local: snap._meta.at_local,
  stations: snap.stations,
  hourly: snap.hourly,
  clock: snap.clock,
  contract: snap.contract,
};

const at = process.env.NEXT_PUBLIC_DEMO_AT ?? RECORDED.at_local;

async function fetchLive(): Promise<BiciUtilData> {
  const [st, hr, ck, ct] = await Promise.all([
    apiGet<{ mode: string; c2_mode: string; stations: BiciUtilStation[] }>(`/bici-util/stations?at=${at}`),
    apiGet<{ hours: HourPoint[] }>("/bici-util/hourly"),
    apiGet<Clock>(`/bici-util/clock?at=${at}`),
    apiGet<Contract>(`/bici-util/contract?at=${at}`),
  ]);
  return {
    mode: st.mode,
    c2_mode: st.c2_mode,
    at_local: at,
    stations: st.stations.filter((s) => s.lat && s.lon),
    hourly: hr.hours,
    clock: ck,
    contract: ct,
  };
}

export function useBiciUtil(): { data: BiciUtilData; source: Source; loading: boolean } {
  const live = config.dataMode === "api";
  const [state, setState] = useState<{ data: BiciUtilData; source: Source; loading: boolean }>({
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
