"""Línea 2 · Taller: bicis dañadas y riesgo de pérdida.

Modos (igual que la Línea 3):
- EJEMPLO: sin datos, responde con shared/contracts/*.example.json.
- REAL: DATA_DIR=/ruta/a/data con data/trips/trips_2026-0X.parquet (salen de prepare_data.py).

Tareas pendientes (ver plan unificado):
- D2 ignored_bikes(): bici anclada mientras salen >=30 bicis de su estación en 24 h.
- D3 priority(): sospechosas × salidas en pico × % del tiempo vacía.
- D4 loss_risk(): último arribo aquí y ninguna salida en 3+ semanas.
"""

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = REPO_ROOT / "shared" / "contracts"

IGNORED_MIN_DEPARTURES = 30      # salidas de otras bicis mientras la bici sigue anclada
IGNORED_WINDOW_H = 24
LOST_AFTER_DAYS = 21


@dataclass
class Data:
    mode: str                      # "EJEMPLO" | "REAL"
    trips_dir: Path | None = None
    reports: list[dict] = field(default_factory=list)   # D5: en memoria por ahora


def _example(name: str) -> list[dict]:
    return json.loads((CONTRACTS / f"{name}.example.json").read_text(encoding="utf-8"))


def load() -> Data:
    data_dir = os.getenv("DATA_DIR")
    if data_dir:
        trips = Path(data_dir) / "trips"
        if any(trips.glob("trips_*.parquet")):
            return Data(mode="REAL", trips_dir=trips)
    return Data(mode="EJEMPLO", reports=_example("c4_reports"))


def ignored_bikes(data: Data) -> list[dict]:
    """D2. TODO: implementar con duckdb sobre data.trips_dir."""
    return []


def priority(data: Data) -> list[dict]:
    """D3. En modo EJEMPLO devuelve el ejemplo de C2."""
    if data.mode == "EJEMPLO":
        return _example("c2_priority")
    return []  # TODO D3


def loss_risk(data: Data) -> list[dict]:
    """D4. En modo EJEMPLO devuelve el ejemplo de C6."""
    if data.mode == "EJEMPLO":
        return _example("c6_loss_risk")
    return []  # TODO D4
