"use client";

import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { applyBrandStyle } from "@/components/map/brand-style";
import { config } from "@/lib/config";
import type { ZoneFlow } from "./flow-data";

interface Props {
  flows: ZoneFlow[];
  empty: number;
  frame: number;
  playing: boolean;
  onUnavailable: () => void;
}

/** Solo se importa en el panel y con movimiento permitido. */
export default function FlowMap({ flows, empty, frame, playing, onUnavailable }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const overlay = useRef<MapLibreOverlay | null>(null);
  const latest = useRef({ flows, empty, frame, playing });

  useEffect(() => {
    if (!container.current) return;
    let map: maplibregl.Map | undefined;
    let observer: ResizeObserver | undefined;
    const timeout = window.setTimeout(onUnavailable, 12000);
    const unavailable = () => onUnavailable();
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: config.mapStyleUrl,
        center: [-99.171, 19.44],
        zoom: 13.1,
        pitch: 45,
        bearing: -12,
        attributionControl: { compact: true },
        canvasContextAttributes: { antialias: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", unavailable);
      map.getCanvas().addEventListener("webglcontextlost", unavailable);
      map.once("load", () => {
        window.clearTimeout(timeout);
        if (!map) return;
        try {
          applyBrandStyle(map);
          const bounds = new maplibregl.LngLatBounds();
          for (const flow of latest.current.flows) {
            bounds.extend(flow.source);
            bounds.extend(flow.target);
          }
          map.fitBounds(bounds, { padding: 55, maxZoom: 13.3, duration: 0 });
          const control = new MapLibreOverlay({ interleaved: true, onError: unavailable });
          map.addControl(control);
          overlay.current = control;
          control.setProps({ layers: layers(latest.current) });
        } catch {
          unavailable();
        }
      });
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(container.current);
    } catch {
      unavailable();
    }
    return () => {
      window.clearTimeout(timeout);
      observer?.disconnect();
      overlay.current = null;
      if (map) {
        map.getCanvas().removeEventListener("webglcontextlost", unavailable);
        map.off("error", unavailable);
        map.remove(); // También libera el overlay intercalado.
      }
    };
  }, [onUnavailable]);

  useEffect(() => {
    latest.current = { flows, empty, frame, playing };
    overlay.current?.setProps({ layers: layers(latest.current) });
  }, [flows, empty, frame, playing]);

  return <div ref={container} className="h-full w-full rounded-2xl" role="img" aria-label="Arcos de contraflujo por zonas sobre mapa 3D. La tabla y el contador ofrecen la misma información." />;
}

function layers({ flows, empty, frame, playing }: Omit<Props, "onUnavailable">) {
  const zones = [...new Map(flows.flatMap((f) => [[f.from, f.source], [f.to, f.target]] as const))].map(([name, position]) => ({ name, position }));
  return [
    new ArcLayer<ZoneFlow>({
      id: "counterflow-arcs",
      data: flows,
      getSourcePosition: (f) => f.source,
      getTargetPosition: (f) => f.target,
      getSourceColor: [63, 164, 116, 200],
      getTargetColor: [205, 241, 99, 255],
      getWidth: (f) => 1 + Math.sqrt(f.trips),
      widthScale: playing ? 1 + 0.18 * Math.sin(frame * Math.PI / 2) : 1,
      transitions: { widthScale: { duration: 800, easing: (t: number) => (1 - Math.cos(Math.PI * t)) / 2 } },
    }),
    new ScatterplotLayer({
      id: "target-empty-stations",
      // La serie pública de S3 agrega las dos zonas: no se atribuye toda a Buenavista.
      data: [{ position: [-99.1565, 19.4435], empty }],
      getPosition: (d) => d.position,
      getRadius: (d) => Math.sqrt(d.empty) * 48,
      getFillColor: [197, 117, 47, 75],
      stroked: true,
      getLineColor: [168, 92, 30],
      lineWidthMinPixels: 2,
      transitions: { getRadius: 450 },
      updateTriggers: { getRadius: empty },
    }),
    new TextLayer({
      id: "zone-labels",
      data: zones,
      getPosition: (z) => z.position,
      getText: (z) => z.name,
      getSize: 13,
      getColor: [21, 54, 38],
      getPixelOffset: [0, 16],
      background: true,
      getBackgroundColor: [255, 255, 255, 225],
      backgroundPadding: [5, 3],
      fontFamily: "sans-serif",
    }),
  ];
}
