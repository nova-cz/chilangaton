import type { StationOption } from "./api";

/** "014" → "14", "080-081" → "80-81": el catálogo trae códigos con ceros a la izquierda. */
export function stripZeros(code: string): string {
  return code
    .split("-")
    .map((part) => part.replace(/^0+(?=\d)/, ""))
    .join("-");
}

/** Encuentra una estación por su número, escrito como "14", "014" o "CE-014". */
export function findByCode(stations: StationOption[], input: string): StationOption | null {
  const code = stripZeros(input.trim().toLowerCase().replace(/^ce-?/, ""));
  return code ? (stations.find((s) => stripZeros(s.code) === code) ?? null) : null;
}
