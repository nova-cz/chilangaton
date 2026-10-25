import type { StationDataset } from "@/features/stations/types";
import type { ViajeStation } from "@/features/viaje/types";

export function stationDataset(response: { mode: string; stations: ViajeStation[] }): StationDataset {
  return {
    label: response.mode,
    generatedAt: response.stations.find((s) => s.data_ts)?.data_ts ?? null,
    missions: [],
    stations: response.stations.map((s) => ({
      id: s.station_id,
      name: s.name,
      zone: "CDMX",
      lat: s.lat,
      lon: s.lon,
      capacity: s.capacity,
      bikes_available: s.useful_bikes_now,
      docks_available: s.docks_available_now,
      is_renting: s.is_renting,
      is_returning: s.is_returning,
      data_ts: s.data_ts,
    })),
  };
}
