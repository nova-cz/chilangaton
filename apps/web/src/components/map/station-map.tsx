"use client";

import type { DemoStation } from "@/features/demo/types";
import { stationTone, type Tone } from "@/features/stations/status";
import { StateMessage } from "@/components/ui/state-message";
import { config } from "@/lib/config";
import { cn } from "@/lib/cn";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection } from "geojson";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { applyBrandStyle, setBuildings3d } from "./brand-style";

/** Corredor Buenavista–Reforma–Polanco. */
export const CORRIDOR_VIEW = { center: [-99.1735, 19.4365] as [number, number], zoom: 13.4 };

/** Cámara 3D de arranque. */
const VIEW_3D = { pitch: 60, bearing: -20 };

const SOURCE_ID = "equilibici-stations";
const COLUMNS_LAYER = "equilibici-columns";
const HALO_LAYER = "equilibici-halo";
const SELECTED_LAYER = "equilibici-selected";

/** Metros de altura por bici disponible (mínimo 4 m para que se vea la base). */
const METERS_PER_BIKE = 7;
const MIN_HEIGHT = 4;

const TONE_COLOR: Record<Tone, string> = { ok: "#22c470", warn: "#e6a23c", danger: "#d84949" };

export interface StationMapProps {
  stations: DemoStation[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Vista 3D: edificios con alturas de OpenStreetMap y estaciones como columnas (si el estilo las trae). */
  view3d?: boolean;
  /** Avisa si el estilo de mapa tiene geometría de edificios para 3D. */
  on3dSupport?: (supported: boolean) => void;
  /** Desplaza el centro al seleccionar (p. ej. para no quedar bajo el bottom sheet). */
  focusOffset?: [number, number];
  /** Margen al encuadrar todas las estaciones (deja libres header y sheets). */
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  /** Cambia para volver a encuadrar el corredor completo. */
  recenterSignal?: number;
  errorAction?: ReactNode;
  className?: string;
}

type MarkerEntry = { marker: Marker; el: HTMLButtonElement; tone: Tone; height: number; selected: boolean };

const MARKER_BASE =
  "flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-full px-2 text-[13px] font-bold tabular-nums " +
  "shadow-[0_6px_16px_-4px_rgb(6_63_46/0.45)] ring-[3px] transition-[transform,background-color,color] duration-200";
const MARKER_RING: Record<Tone, string> = { ok: "ring-brand-400", warn: "ring-warning-500", danger: "ring-danger-500" };

function paintMarkers(markers: Map<string, MarkerEntry>, selectedId: string | null) {
  for (const [id, entry] of markers) {
    const selected = id === selectedId;
    entry.el.setAttribute("aria-pressed", String(selected));
    if (entry.el.parentElement) entry.el.parentElement.style.zIndex = selected ? "10" : "";
    if (entry.selected === selected && entry.el.className) continue;
    entry.selected = selected;
    entry.el.className = cn(
      MARKER_BASE,
      selected ? "z-10 scale-110 animate-pop bg-brand-900 text-white ring-lime-300" : cn("bg-white text-ink", MARKER_RING[entry.tone]),
    );
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

/** Polígono de n lados (≈ cilindro) de radio en metros. */
function disc(lon: number, lat: number, radiusM: number, sides = 14): [number, number][] {
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    ring.push([lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat]);
  }
  const first = ring[0];
  if (first) ring.push(first);
  return ring;
}

function stationHeight(bikes: number) {
  return Math.max(bikes * METERS_PER_BIKE, MIN_HEIGHT);
}

function stationsGeoJson(stations: DemoStation[]): FeatureCollection {
  const features: Feature[] = [];
  for (const s of stations) {
    const tone = stationTone(s.bikes_available, s.docks_available);
    const common = { id: s.id, color: TONE_COLOR[tone] };
    features.push({
      type: "Feature",
      properties: { ...common, kind: "column", h: stationHeight(s.bikes_available) },
      geometry: { type: "Polygon", coordinates: [disc(s.lon, s.lat, 34)] },
    });
    features.push({
      type: "Feature",
      properties: { ...common, kind: "halo", h: 1 },
      geometry: { type: "Polygon", coordinates: [disc(s.lon, s.lat, 62, 28)] },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Altura animada de columnas: `grow` 0→1 al entrar, `pulse` 0→1→0 al seleccionar. */
function setColumnHeights(map: MlMap, grow: number, pulse: number, selectedId: string | null) {
  if (!map.getLayer(COLUMNS_LAYER)) return;
  map.setPaintProperty(COLUMNS_LAYER, "fill-extrusion-height", [
    "*",
    ["get", "h"],
    grow,
    ["case", ["==", ["get", "id"], selectedId ?? ""], 1 + 0.18 * pulse, 1],
  ]);
}

function ensureStationLayers(map: MlMap, stations: DemoStation[]) {
  const data = stationsGeoJson(stations);
  const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(SOURCE_ID, { type: "geojson", data });
  const firstSymbol = map.getStyle()?.layers.find((layer) => layer.type === "symbol")?.id;
  map.addLayer(
    {
      id: HALO_LAYER,
      type: "fill-extrusion",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "halo"],
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": 1.2,
        "fill-extrusion-opacity": 0.28,
        "fill-extrusion-vertical-gradient": false,
      },
    },
    firstSymbol,
  );
  map.addLayer(
    {
      id: SELECTED_LAYER,
      type: "fill-extrusion",
      source: SOURCE_ID,
      filter: ["all", ["==", ["get", "kind"], "halo"], ["==", ["get", "id"], ""]],
      paint: {
        "fill-extrusion-color": "#cdee8a",
        "fill-extrusion-height": 2.4,
        "fill-extrusion-opacity": 0.9,
        "fill-extrusion-vertical-gradient": false,
      },
    },
    firstSymbol,
  );
  map.addLayer(
    {
      id: COLUMNS_LAYER,
      type: "fill-extrusion",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "column"],
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "h"],
        "fill-extrusion-opacity": 0.96,
      },
    },
    firstSymbol,
  );
}

/** Interpolación con ease-out cúbico. */
function tween(duration: number, onFrame: (t: number) => void, onDone?: () => void) {
  const start = performance.now();
  let id = 0;
  const step = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    onFrame(1 - Math.pow(1 - t, 3));
    if (t < 1) id = requestAnimationFrame(step);
    else onDone?.();
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

export default function StationMap({
  stations,
  selectedId = null,
  onSelect,
  view3d = false,
  on3dSupport,
  focusOffset = [0, 0],
  fitPadding = { top: 40, bottom: 40, left: 40, right: 40 },
  recenterSignal = 0,
  errorAction,
  className,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef(new Map<string, MarkerEntry>());
  const callbacks = useRef({ onSelect, on3dSupport });
  const live = useRef({ selectedId, view3d, stations, fitPadding, focusOffset });
  const growRef = useRef(0);
  const flying = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => (webglAvailable() ? "loading" : "error"));

  useEffect(() => {
    callbacks.current = { onSelect, on3dSupport };
    live.current = { selectedId, view3d, stations, fitPadding, focusOffset };
  });

  /** Sube cada marcador sobre la cima de su columna (la altura proyectada depende del zoom y el pitch). */
  const updateLifts = () => {
    const map = mapRef.current;
    if (!map) return;
    const pitch = (map.getPitch() * Math.PI) / 180;
    const metersPerPixel = (78271.517 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
    for (const entry of markersRef.current.values()) {
      const lift = ((entry.height * growRef.current) / metersPerPixel) * Math.sin(pitch);
      entry.el.style.translate = `0 ${-(Math.min(lift, 260) + 20 * Math.sin(pitch))}px`;
    }
  };

  const frameCorridor = (map: MlMap, animate: boolean) => {
    const { stations: list, fitPadding: padding, view3d: is3d } = live.current;
    const bounds = new maplibregl.LngLatBounds();
    for (const s of list) bounds.extend([s.lon, s.lat]);
    const camera = list.length > 1 ? map.cameraForBounds(bounds, { padding, maxZoom: 15.2 }) : undefined;
    // En 3D los edificios solo existen desde z≈13: se acerca aunque el corredor completo no quepa en pantalla.
    const target = {
      center: camera?.center ?? CORRIDOR_VIEW.center,
      zoom: is3d ? Math.min(Math.max((camera?.zoom ?? CORRIDOR_VIEW.zoom) + 0.4, 13.9), 15.2) : (camera?.zoom ?? CORRIDOR_VIEW.zoom),
      pitch: is3d ? VIEW_3D.pitch : 0,
      bearing: is3d ? VIEW_3D.bearing : 0,
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduceMotion) {
      map.jumpTo(target);
      return;
    }
    flying.current = true;
    map.once("moveend", () => (flying.current = false));
    map.flyTo({ ...target, duration: 3200, curve: 1.3, essential: false });
  };

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || !webglAvailable()) return;
    let loaded = false;
    let cancelGrow = () => {};
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: config.mapStyleUrl,
      center: CORRIDOR_VIEW.center,
      zoom: CORRIDOR_VIEW.zoom - 1.4,
      maxPitch: 70,
      attributionControl: { compact: true },
      fadeDuration: reduceMotion ? 0 : 300,
    });
    mapRef.current = map;
    const timeout = window.setTimeout(() => !loaded && setStatus("error"), 15000);
    map.on("load", () => {
      loaded = true;
      window.clearTimeout(timeout);
      applyBrandStyle(map);
      ensureStationLayers(map, live.current.stations);
      const supported = setBuildings3d(map, live.current.view3d);
      callbacks.current.on3dSupport?.(supported);
      setStatus("ready");
      frameCorridor(map, true);
      // Las columnas crecen desde el piso al entrar.
      growRef.current = reduceMotion ? 1 : 0;
      setColumnHeights(map, growRef.current, 0, live.current.selectedId);
      if (!reduceMotion) {
        cancelGrow = tween(
          1500,
          (t) => {
            growRef.current = t;
            setColumnHeights(map, t, 0, live.current.selectedId);
            updateLifts();
          },
          () => (growRef.current = 1),
        );
      }
      updateLifts();
    });
    map.on("error", () => {
      if (!loaded) setStatus("error"); // después de cargar, un tile fallido no es fatal
    });
    map.on("click", () => callbacks.current.onSelect?.(null));
    map.on("move", updateLifts);
    const markers = markersRef.current;
    return () => {
      cancelGrow();
      window.clearTimeout(timeout);
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
    // frameCorridor y updateLifts solo leen refs.
  }, []);

  // Estaciones: fuente de columnas y marcadores.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    ensureStationLayers(map, stations);
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
      markers.set(station.id, { marker, el, tone, height: stationHeight(station.bikes_available), selected: false });
    }
    paintMarkers(markers, live.current.selectedId);
    updateLifts();
  }, [stations, status]);

  // Selección: marcador, resalte, pulso de la columna y cámara.
  useEffect(() => {
    paintMarkers(markersRef.current, selectedId);
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    map.setFilter(SELECTED_LAYER, ["all", ["==", ["get", "kind"], "halo"], ["==", ["get", "id"], selectedId ?? ""]]);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancel = () => {};
    if (selectedId && !reduceMotion) {
      cancel = tween(
        600,
        (t) => {
          setColumnHeights(map, growRef.current, Math.sin(t * Math.PI), selectedId);
          updateLifts();
        },
        () => setColumnHeights(map, growRef.current, 0, selectedId),
      );
    } else {
      setColumnHeights(map, growRef.current, 0, selectedId);
    }
    const station = stations.find((s) => s.id === selectedId);
    if (station) {
      map.easeTo({
        center: [station.lon, station.lat],
        offset: focusOffset,
        zoom: Math.max(map.getZoom(), 15.4),
        duration: reduceMotion ? 0 : 700,
      });
    }
    return cancel;
    // focusOffset es estable por layout; no reenfocar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, stations, status]);

  // 2D / 3D.
  const firstView = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    setBuildings3d(map, view3d);
    if (firstView.current) {
      firstView.current = false; // la entrada ya voló a la cámara correcta
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({
      pitch: view3d ? VIEW_3D.pitch : 0,
      bearing: view3d ? VIEW_3D.bearing : 0,
      zoom: view3d ? Math.max(map.getZoom(), 15) : map.getZoom(),
      duration: reduceMotion ? 0 : 900,
    });
  }, [view3d, status]);

  // Volver a encuadrar el corredor.
  const lastSignal = useRef(recenterSignal);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || lastSignal.current === recenterSignal) return;
    lastSignal.current = recenterSignal;
    frameCorridor(map, true);
  }, [recenterSignal, status]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#f2efea]", className)}>
      <div ref={containerRef} className="h-full w-full" aria-label="Mapa de estaciones (datos DEMO)" role="region" />
      <div
        aria-hidden={status === "ready"}
        className={cn(
          "absolute inset-0 grid place-items-center bg-[#f2efea] transition-opacity duration-700",
          status === "ready" ? "pointer-events-none opacity-0" : "opacity-100",
          status === "error" && "hidden",
        )}
      >
        <StateMessage kind="loading" title="Cargando mapa…" />
      </div>
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
