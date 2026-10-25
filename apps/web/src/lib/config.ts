/**
 * Configuración pública del frontend. Solo variables NEXT_PUBLIC_* (nunca secretos).
 * - NEXT_PUBLIC_DATA_MODE: "demo" (fixtures) | "api" (FastAPI). Por defecto "api".
 * - NEXT_PUBLIC_API_URL: URL de la API en Railway, p. ej. https://equilibici-api.up.railway.app
 * - NEXT_PUBLIC_MAP_STYLE_URL: estilo MapLibre. Por defecto OpenFreeMap Positron (sin API key).
 */
export const config = {
  dataMode: process.env.NEXT_PUBLIC_DATA_MODE === "demo" ? "demo" : "api",
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, ""),
  apiPrefix: "/api/v1",
  mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron",
} as const;

export type DataMode = (typeof config)["dataMode"];
