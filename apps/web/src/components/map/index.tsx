"use client";

import { StateMessage } from "@/components/ui/state-message";
import dynamic from "next/dynamic";

/** MapLibre solo corre en el navegador (WebGL). */
export const StationMap = dynamic(() => import("./station-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#eef2ef]">
      <StateMessage kind="loading" title="Cargando mapa…" />
    </div>
  ),
});

export type { StationMapProps } from "./station-map";
