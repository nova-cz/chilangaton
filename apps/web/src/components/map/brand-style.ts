import type { ExpressionSpecification, Map as MlMap } from "maplibre-gl";

/** Edificios extruidos (OpenMapTiles: render_height / render_min_height). */
export const BUILDINGS_3D_LAYER = "equilibici-3d-buildings";

const PALETTE = {
  land: "#f2efea",
  residential: "#eeeae3",
  park: "#d9e9cf",
  wood: "#cfe2c4",
  water: "#c5ded8",
  roadInner: "#ffffff",
  roadCasing: "#e4ded4",
  motorwayInner: "#fff7e8",
  motorwayCasing: "#e3d6c0",
  path: "#e5dfd5",
  text: "#5a6a61",
  halo: "#f6f3ee",
  buildingFlat: "#e6e0d6",
};

function paint(map: MlMap, id: string, property: string, value: unknown) {
  try {
    map.setPaintProperty(id, property, value as never);
  } catch {
    // El estilo remoto puede cambiar: una propiedad ausente no debe romper el mapa.
  }
}

/** Estilo propio sobre Positron: grises cálidos, verdes suaves de la marca, poco ruido, luz y bruma. */
export function applyBrandStyle(map: MlMap) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;
  for (const layer of layers) {
    const { id } = layer;
    if (layer.type === "background") paint(map, id, "background-color", PALETTE.land);
    else if (id === "park") paint(map, id, "fill-color", PALETTE.park);
    else if (id === "landcover_wood") paint(map, id, "fill-color", PALETTE.wood);
    else if (id === "landuse_residential") paint(map, id, "fill-color", PALETTE.residential);
    else if (id === "water") paint(map, id, "fill-color", PALETTE.water);
    else if (id === "waterway") paint(map, id, "line-color", PALETTE.water);
    else if (id === "building") {
      paint(map, id, "fill-color", PALETTE.buildingFlat);
      paint(map, id, "fill-opacity", 1);
    } else if (layer.type === "line" && /casing/.test(id)) {
      paint(map, id, "line-color", /motorway/.test(id) ? PALETTE.motorwayCasing : PALETTE.roadCasing);
    } else if (layer.type === "line" && /^highway_(minor|major_inner|major_subtle)$/.test(id)) {
      paint(map, id, "line-color", PALETTE.roadInner);
    } else if (layer.type === "line" && /^highway_motorway_(inner|subtle)$|bridge_inner|tunnel_motorway_inner/.test(id)) {
      paint(map, id, "line-color", PALETTE.motorwayInner);
    } else if (id === "highway_path") {
      paint(map, id, "line-color", PALETTE.path);
    } else if (layer.type === "symbol") {
      if (/shield|airport|label_(country|state|village)/.test(id)) {
        map.setLayoutProperty(id, "visibility", "none");
      } else {
        paint(map, id, "text-color", PALETTE.text);
        paint(map, id, "text-halo-color", PALETTE.halo);
        paint(map, id, "text-halo-width", 1.4);
      }
    }
  }

  // Luz direccional cálida y bruma sutil hacia el horizonte.
  try {
    map.setLight({ anchor: "viewport", color: "#fff1d9", intensity: 0.42, position: [1.4, 210, 52] });
    map.setSky({
      "sky-color": "#d9e7ef",
      "horizon-color": "#f6efe3",
      "fog-color": "#f3eee6",
      "sky-horizon-blend": 0.55,
      "horizon-fog-blend": 0.7,
      "fog-ground-blend": 0.3,
    });
  } catch {
    // Sin luz o cielo, el mapa sigue siendo legible.
  }
}

/** Fuente vectorial con capa `building` (esquema OpenMapTiles). */
function findBuildingSource(map: MlMap): string | null {
  const style = map.getStyle();
  // Con internet lento getStyle() puede devolver undefined antes de que llegue el estilo remoto.
  if (!style?.sources || !style.layers) return null;
  for (const [id, source] of Object.entries(style.sources ?? {})) {
    if (source.type !== "vector") continue;
    const usesBuildings = style.layers.some(
      (layer) => "source" in layer && layer.source === id && "source-layer" in layer && layer["source-layer"] === "building",
    );
    if (usesBuildings || id === "openmaptiles") return id;
  }
  return null;
}

const HEIGHT: ExpressionSpecification = ["coalesce", ["get", "render_height"], 0];

/** Muestra edificios extruidos (3D) o planos (2D). Devuelve si el estilo trae geometría de edificios. */
export function setBuildings3d(map: MlMap, enabled: boolean): boolean {
  if (!map.isStyleLoaded()) {
    map.once("idle", () => setBuildings3d(map, enabled));
    return false;
  }
  const source = findBuildingSource(map);
  if (!source) return false;
  if (!map.getLayer(BUILDINGS_3D_LAYER)) {
    const firstSymbol = map.getStyle()?.layers.find((layer) => layer.type === "symbol")?.id;
    map.addLayer(
      {
        id: BUILDINGS_3D_LAYER,
        type: "fill-extrusion",
        source,
        "source-layer": "building",
        minzoom: 12.5,
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": ["interpolate", ["linear"], HEIGHT, 0, "#eeebe5", 40, "#e0dcd3", 120, "#cdc7bb", 250, "#b7b0a3"],
          "fill-extrusion-height": HEIGHT,
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.94,
        },
      },
      firstSymbol,
    );
  }
  map.setLayoutProperty(BUILDINGS_3D_LAYER, "visibility", enabled ? "visible" : "none");
  if (map.getLayer("building")) map.setLayoutProperty("building", "visibility", enabled ? "none" : "visible");
  return true;
}
