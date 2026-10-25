"use client";

import type { DemoStation } from "@/features/demo/types";
import { stationTone, type Tone } from "@/features/stations/status";
import { StateMessage } from "@/components/ui/state-message";
import { config } from "@/lib/config";
import { cn } from "@/lib/cn";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Corredor Buenavista–Reforma–Polanco. */
export const CORRIDOR_VIEW = { center: [-99.1735, 19.4365] as [number, number], zoom: 13.4 };

const BUILDINGS_LAYER_ID = "equilibici-3d-buildings";

export interface StationMapProps {
  stations: DemoStation[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Vista 3D: edificios extruidos con alturas reales de OpenStreetMap (si el estilo las trae). */
  view3d?: boolean;
  /** Avisa si el estilo de mapa tiene geometría de edificios para 3D. */
  on3dSupport?: (supported: boolean) => void;
  /** Desplaza el centro al seleccionar (p. ej. para no quedar bajo el bottom sheet). */
  focusOffset?: [number, number];
  /** Margen al encuadrar todas las estaciones al cargar (deja libres header y sheets). */
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  errorAction?: ReactNode;
  className?: string;
}

const MARKER_TONE: Record<Tone, string> = {
  ok: "bg-brand-500 text-white",
  warn: "bg-warning-500 text-ink",
  danger: "bg-danger-500 text-white",
};

function markerClass(tone: Tone, selected: boolean) {
  return cn(
    "flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-xs font-bold tabular-nums",
    "shadow-[0_6px_16px_-4px_rgb(6_63_46/0.45)] ring-[3px] ring-white transition-transform duration-200",
    selected ? "z-10 scale-125 bg-brand-900 text-white" : MARKER_TONE[tone],
  );
}

type MarkerEntry = { marker: Marker; el: HTMLButtonElement; tone: Tone };

function paintMarkers(markers: Map<string, MarkerEntry>, selectedId: string | null) {
  for (const [id, { el, tone }] of markers) {
    el.className = markerClass(tone, id === selectedId);
    el.setAttribute("aria-pressed", String(id === selectedId));
    // El contenedor es de MapLibre: solo se ajusta su z-index para que el seleccionado quede arriba.
    if (el.parentElement) el.parentElement.style.zIndex = id === selectedId ? "10" : "";
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Fuente vectorial con capa `building` (esquema OpenMapTiles: render_height / render_min_height). */
function findBuildingSource(map: MlMap): string | null {
  const style = map.getStyle();
  for (const [id, source] of Object.entries(style.sources ?? {})) {
    if (source.type !== "vector") continue;
    const usesBuildings = style.layers.some(
      (layer) => "source" in layer && layer.source === id && "source-layer" in layer && layer["source-layer"] === "building",
    );
    if (usesBuildings || id === "openmaptiles") return id;
  }
  return null;
}

function setBuildings(map: MlMap, enabled: boolean) {
  const source = findBuildingSource(map);
  if (!source) return;
  if (!map.getLayer(BUILDINGS_LAYER_ID)) {
    const firstSymbol = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
    map.addLayer(
      {
        id: BUILDINGS_LAYER_ID,
        type: "fill-extrusion",
        source,
        "source-layer": "building",
        minzoom: 13,
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0], 0, "#e7efe9", 60, "#cfe0d5", 200, "#a9c7b5"],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.85,
        },
      },
      firstSymbol,
    );
  }
  map.setLayoutProperty(BUILDINGS_LAYER_ID, "visibility", enabled ? "visible" : "none");
}

export default function StationMap({
  stations,
  selectedId = null,
  onSelect,
  view3d = false,
  on3dSupport,
  focusOffset = [0, 0],
  fitPadding = { top: 40, bottom: 40, left: 40, right: 40 },
  errorAction,
  className,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef(new Map<string, MarkerEntry>());
  const callbacks = useRef({ onSelect, on3dSupport });
  const selectedIdRef = useRef(selectedId);
  const initialFit = useRef({ stations, fitPadding });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => (webglAvailable() ? "loading" : "error"));

  useEffect(() => {
    callbacks.current = { onSelect, on3dSupport };
    selectedIdRef.current = selectedId;
  });

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || !webglAvailable()) return;
    let loaded = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: config.mapStyleUrl,
      center: CORRIDOR_VIEW.center,
      zoom: CORRIDOR_VIEW.zoom,
      maxPitch: 65,
      attributionControl: { compact: true },
      fadeDuration: reduceMotion ? 0 : 300,
    });
    mapRef.current = map;
    const timeout = window.setTimeout(() => !loaded && setStatus("error"), 15000);
    map.on("load", () => {
      loaded = true;
      window.clearTimeout(timeout);
      setStatus("ready");
      const { stations: initial, fitPadding: padding } = initialFit.current;
      if (initial.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const s of initial) bounds.extend([s.lon, s.lat]);
        map.fitBounds(bounds, { padding, duration: 0, maxZoom: 15 });
      }
      callbacks.current.on3dSupport?.(findBuildingSource(map) !== null);
    });
    map.on("error", () => {
      if (!loaded) setStatus("error"); // después de cargar, un tile fallido no es fatal
    });
    map.on("click", () => callbacks.current.onSelect?.(null));
    const markers = markersRef.current;
    return () => {
      window.clearTimeout(timeout);
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Marcadores de estaciones.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    for (const { marker } of markers.values()) marker.remove();
    markers.clear();
    for (const station of stations) {
      const tone = stationTone(station.bikes_available, station.docks_available);
      const wrapper = document.createElement("div");
      const el = document.createElement("button");
      wrapper.appendChild(el);
      el.type = "button";
      el.textContent = String(station.bikes_available);
      el.setAttribute(
        "aria-label",
        `${station.name}: ${station.bikes_available} bicis y ${station.docks_available} anclajes libres (DEMO)`,
      );
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        callbacks.current.onSelect?.(station.id);
      });
      const marker = new maplibregl.Marker({ element: wrapper }).setLngLat([station.lon, station.lat]).addTo(map);
      markers.set(station.id, { marker, el, tone });
    }
    paintMarkers(markers, selectedIdRef.current);
  }, [stations]);

  // Selección: estilo del marcador y cámara.
  useEffect(() => {
    paintMarkers(markersRef.current, selectedId);
    const map = mapRef.current;
    const station = stations.find((s) => s.id === selectedId);
    if (map && station) {
      map.easeTo({ center: [station.lon, station.lat], offset: focusOffset, zoom: Math.max(map.getZoom(), 14.5), duration: 600 });
    }
    // focusOffset es estable por layout; no reenfocar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, stations]);

  // 2D / 3D.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    setBuildings(map, view3d);
    map.easeTo({ pitch: view3d ? 55 : 0, bearing: view3d ? -18 : 0, zoom: view3d ? Math.max(map.getZoom(), 15) : map.getZoom(), duration: 900 });
  }, [view3d, status]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#eef2ef]", className)}>
      <div ref={containerRef} className="h-full w-full" aria-label="Mapa de estaciones (datos DEMO)" role="region" />
      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-surface/60">
          <StateMessage kind="loading" title="Cargando mapa…" />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-surface">
          <StateMessage
            kind="error"
            title="No se pudo cargar el mapa"
            description="Puede ser la conexión o que el dispositivo no soporte WebGL. La lista muestra la misma información."
            action={errorAction}
          />
        </div>
      ) : null}
    </div>
  );
}
