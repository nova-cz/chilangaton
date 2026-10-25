import type { ContraflujoResult } from "./types";

export interface ZoneFlow {
  from: string;
  to: string;
  trips: number;
  source: [number, number];
  target: [number, number];
}

/** Los centros son aproximados, publicados por S2 desde zones.py. No son estaciones. */
export function zoneFlows(data: ContraflujoResult): ZoneFlow[] {
  return data.by_zone_pair.flatMap((pair) => {
    const source = data.zones?.[pair.from]?.center;
    const target = data.zones?.[pair.to]?.center;
    return source && target ? [{ from: pair.from, to: pair.to, trips: pair.trips_per_day, source, target }] : [];
  });
}

export function project([lon, lat]: [number, number]): [number, number] {
  return [65 + ((lon + 99.2) / 0.056) * 550, 235 - ((lat - 19.425) / 0.025) * 190];
}
