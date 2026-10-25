"use client";

import { StateMessage } from "@/components/ui/state-message";
import { config } from "@/lib/config";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

export interface RiskPoint {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  bikes: number;
}

const SOURCE = "loss-risk";

/** Color de un token de globals.css; MapLibre no entiende clases de Tailwind. */
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Un círculo por estación, más grande donde más bicis dejan de aparecer. La lista de al lado es la versión equivalente. */
export default function LossRiskMap({ points }: { points: RiskPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [noWebgl] = useState(() => !webglAvailable());
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || noWebgl) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: config.mapStyleUrl,
      center: [-99.165, 19.41],
      zoom: 11.4,
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
        id: "loss-risk-points",
        type: "circle",
        source: SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "bikes"], 1, 5, 10, 18],
          "circle-color": token("--color-danger-500", "#d84949"),
          "circle-opacity": 0.75,
          "circle-stroke-color": token("--color-card", "#ffffff"),
          "circle-stroke-width": 1.2,
        },
      });
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
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { bikes: p.bikes },
      })),
    });
  }, [ready, points]);

  if (failed || noWebgl) {
    return (
      <div className="grid h-full place-items-center bg-surface">
        <StateMessage
          kind="error"
          title="No se pudo mostrar el mapa"
          description="Tu navegador no tiene WebGL o el mapa base no cargó. La lista tiene la misma información."
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="region"
      aria-label="Mapa de riesgo de pérdida por estación. La lista de al lado tiene la misma información."
    />
  );
}
