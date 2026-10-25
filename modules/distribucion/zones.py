"""Zonas del corredor como circulos aproximados (centro + radio en metros).

APROXIMACION: no son poligonos oficiales de colonias; los centros y radios se estimaron a ojo sobre el mapa
para S2/S3 y se pueden ajustar aqui. Una estacion pertenece a la zona de centro mas cercano si esta dentro de su radio.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pandas solo hace falta en analisis offline, no en la API ni en el motor
    import pandas as pd


@dataclass(frozen=True)
class Zone:
    name: str
    lat: float
    lon: float
    radius_m: float
    role: str  # "fills" (se llena de bicis) | "empties" (se queda sin bicis)


ZONES: tuple[Zone, ...] = (
    Zone("Anzures", 19.4400, -99.1790, 700, "fills"),
    Zone("Polanco", 19.4360, -99.1930, 900, "fills"),
    Zone("Reforma", 19.4300, -99.1700, 900, "fills"),
    Zone("Buenavista", 19.4460, -99.1530, 700, "empties"),
    Zone("San Rafael", 19.4410, -99.1600, 650, "empties"),
)
FILLING = tuple(z.name for z in ZONES if z.role == "fills")
EMPTYING = tuple(z.name for z in ZONES if z.role == "empties")


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 6_371_000 * 2 * math.asin(math.sqrt(a))


def zone_of(lat: float, lon: float) -> str | None:
    best: tuple[float, str] | None = None
    for z in ZONES:
        d = haversine_m(lat, lon, z.lat, z.lon)
        if d <= z.radius_m and (best is None or d < best[0]):
            best = (d, z.name)
    return best[1] if best else None


def assign_zones(stations: pd.DataFrame) -> pd.Series:
    """Serie code -> nombre de zona (NaN si queda fuera de todas)."""
    import pandas as pd

    return pd.Series({code: zone_of(row.latitude, row.longitude) for code, row in stations.iterrows()}, name="zone")


def print_zone_counts(stations: pd.DataFrame) -> dict[str, int]:
    zones = assign_zones(stations)
    counts = {z.name: int((zones == z.name).sum()) for z in ZONES}
    for z in ZONES:
        print(f"  {z.name:<11} ({'se llena' if z.role == 'fills' else 'se vacia'}, r={z.radius_m:.0f} m): {counts[z.name]} estaciones")
    return counts
