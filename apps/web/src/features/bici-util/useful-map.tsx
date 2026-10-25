"use client";

import { StateMessage } from "@/components/ui/state-message";
import { config } from "@/lib/config";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { overClock, usefulState } from "./format";
import type { BiciUtilStation } from "./types";

/** Colores del semáforo (mismos tokens que globals.css). */
const COLORS = { ok: "#009b4d", warn: "#e6a23c", danger: "#d84949", closed: "#9aa8a0" } as const;
const SOURCE = "bici-util";

type GeoData = Parameters<GeoJSONSource["setData"]>[0];

function toGeoJSON(stations: BiciUtilStation[], selectedId: string | null): GeoData {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      id: s.station_id,
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: {
        id: s.station_id,
        tone: usefulState(s).tone,
        over: overClock(s),
        selected: s.station_id === selectedId,
      },
    })),
  };
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Mapa 2D de bici útil. Un punto por estación (capa de círculos, aguanta las ~680 estaciones).
 * No es la única forma de ver el dato: la tabla de al lado es la versión equivalente y accesible.
 */
export default function UsefulMap({
  stations,
  selectedId,
  onSelect,
}: {
  stations: BiciUtilStation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const [noWebgl] = useState(() => !webglAvailable());
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || noWebgl) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: config.mapStyleUrl,
      center: [-99.165, 19.41],
      zoom: 11.6,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => {
      if (!map.loaded() && String(e.error?.message ?? "").includes("style")) setFailed(true);
    });
    map.on("load", () => {
      map.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "bici-util-points",
        type: "circle",
        source: SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, ["case", ["get", "selected"], 8, 4], 15, ["case", ["get", "selected"], 14, 9]],
          "circle-color": ["match", ["get", "tone"], "ok", COLORS.ok, "warn", COLORS.warn, "danger", COLORS.danger, COLORS.closed],
          // Contorno oscuro grueso = fuera del plazo de 36 h; blanco = dentro del plazo.
          "circle-stroke-color": ["case", ["get", "selected"], "#063f2e", ["get", "over"], "#12251b", "#ffffff"],
          "circle-stroke-width": ["case", ["any", ["get", "selected"], ["get", "over"]], 3, 1.2],
        },
      });
      map.on("click", "bici-util-points", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        onSelectRef.current(id ?? null);
      });
      map.on("mouseenter", "bici-util-points", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "bici-util-points", () => (map.getCanvas().style.cursor = ""));
      setReady(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [noWebgl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(toGeoJSON(stations, selectedId));
  }, [ready, stations, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const s = stations.find((x) => x.station_id === selectedId);
    if (!ready || !map || !s) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 14), duration: reduce ? 0 : 600 });
  }, [ready, selectedId, stations]);

  if (failed || noWebgl) {
    return (
      <div className="grid h-full place-items-center bg-surface">
        <StateMessage
          kind="error"
          title="No se pudo mostrar el mapa"
          description="Tu navegador no tiene WebGL o el mapa base no cargó. La tabla tiene la misma información."
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="region"
      aria-label="Mapa de bici útil por estación. La tabla de estaciones tiene la misma información."
    />
  );
}
