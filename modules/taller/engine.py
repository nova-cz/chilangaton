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
import logging
import os
from datetime import timezone
from zoneinfo import ZoneInfo
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = REPO_ROOT / "shared" / "contracts"

IGNORED_MIN_DEPARTURES = 30      # salidas de otras bicis mientras la bici sigue anclada
IGNORED_WINDOW_H = 24
IGNORED_MAX_AGE_H = 72          # anclada más tiempo: probablemente ya la retiraron
LOST_AFTER_DAYS = 21
PEAK_HOURS = ((7, 10), (18, 21))   # hora CDMX, días hábiles
HOLIDAYS = ("2026-09-16",)
CDMX = ZoneInfo("America/Mexico_City")


@dataclass
class Data:
    mode: str                      # "EJEMPLO" | "REAL"
    trips_dir: Path | None = None
    reports: list[dict] = field(default_factory=list)   # D5: en memoria por ahora


def _example(name: str) -> list[dict]:
    return json.loads((CONTRACTS / f"{name}.example.json").read_text(encoding="utf-8"))


def load() -> Data:
    data_dir = (os.getenv("DATA_DIR") or "").strip()
    if data_dir:
        trips = Path(data_dir).resolve() / "trips"
        if any(trips.glob("trips_*.parquet")):
            logging.info("taller: modo REAL con %s", trips)
            return Data(mode="REAL", trips_dir=trips)
        logging.warning("taller: DATA_DIR=%r no tiene trips/trips_*.parquet; uso EJEMPLO", data_dir)
    else:
        logging.info("taller: sin DATA_DIR; modo EJEMPLO")
    return Data(mode="EJEMPLO", reports=_example("c4_reports"))


IGNORED_SQL = """
WITH t AS (
    SELECT CAST(bike_id AS VARCHAR) AS bike_id, start_key, start_local, end_key, end_local
    FROM read_parquet($glob)
    WHERE start_local IS NOT NULL AND end_local IS NOT NULL
),
docked AS (                      -- cada vez que una bici queda anclada y cuándo vuelve a salir
    SELECT bike_id, end_key AS station_key, end_local AS docked_since,
           LEAD(start_local) OVER (PARTITION BY bike_id ORDER BY start_local) AS next_out
    FROM t
),
now_docked AS (                  -- ancladas en `at`, hace menos de 3 semanas (más es D4)
    SELECT * FROM docked
    WHERE docked_since <= $at
      AND (next_out IS NULL OR next_out > $at)
      AND docked_since >= $at - INTERVAL (CAST($lost AS INTEGER)) DAY
      AND station_key IS NOT NULL
),
departures AS (                  -- salidas de la estación en las últimas 24 h
    SELECT start_key AS station_key, start_local
    FROM t
    WHERE start_local > $at - INTERVAL (CAST($window AS INTEGER)) HOUR AND start_local <= $at
)
SELECT n.station_key, n.bike_id, n.docked_since, COUNT(*) AS departures_while_docked
FROM now_docked n
JOIN departures d ON d.station_key = n.station_key AND d.start_local >= n.docked_since
GROUP BY ALL
HAVING COUNT(*) >= $min_dep
ORDER BY departures_while_docked DESC
"""


def latest_time(data: Data) -> datetime | None:
    """Último retiro registrado (hora CDMX). Sirve de `at` por defecto en modo REAL."""
    if data.mode != "REAL":
        return None
    import duckdb
    glob = str(data.trips_dir / "trips_*.parquet")
    return duckdb.execute("SELECT max(start_local) FROM read_parquet(?)", [glob]).fetchone()[0]


def ignored_bikes(data: Data, at: datetime | None = None) -> list[dict]:
    """D2 · Bici ignorada: sigue anclada mientras salieron >=30 bicis de su estación en 24 h.

    `at` va en hora CDMX sin zona (igual que start_local). Es una señal, no un diagnóstico:
    la bici probablemente no sirve, nadie la eligió.
    """
    if data.mode != "REAL":
        return []
    import duckdb  # solo hace falta en modo REAL
    at = (at or latest_time(data)).replace(tzinfo=None)
    rows = duckdb.execute(IGNORED_SQL, {
        "glob": str(data.trips_dir / "trips_*.parquet"), "at": at,
        "window": IGNORED_WINDOW_H, "lost": LOST_AFTER_DAYS, "min_dep": IGNORED_MIN_DEPARTURES,
    }).fetchall()
    out = []
    for st, bike, since, n in rows:
        age_h = (at - since).total_seconds() / 3600
        out.append({
            "station_key": st, "bike_id": bike, "docked_since": since.isoformat(timespec="minutes"),
            "hours_docked": round(age_h, 1), "departures_while_docked": n,
            "signal": "bici ignorada" if age_h < IGNORED_MAX_AGE_H else "sin movimiento 3+ días",
        })
    return out


def suspected_by_station(items: list[dict]) -> dict[str, int]:
    """Cuenta solo las bicis ignoradas (no las sin movimiento) por estación. Alimenta C2."""
    counts: dict[str, int] = {}
    for i in items:
        if i["signal"] == "bici ignorada":
            counts[i["station_key"]] = counts.get(i["station_key"], 0) + 1
    return counts


PEAK_SQL = """
SELECT start_key AS station_key,
       COUNT(*) * 1.0 / COUNT(DISTINCT CAST(start_local AS DATE)) AS peak_departures
FROM read_parquet($glob)
WHERE start_key IS NOT NULL
  AND date_trunc('month', start_local) = date_trunc('month', CAST($at AS TIMESTAMP))
  AND isodow(start_local) <= 5
  AND CAST(start_local AS DATE) NOT IN (SELECT CAST(unnest($holidays) AS DATE))
  AND ((hour(start_local) >= $p1a AND hour(start_local) < $p1b)
    OR (hour(start_local) >= $p2a AND hour(start_local) < $p2b))
GROUP BY 1
"""


def peak_departures(data: Data, at: datetime) -> dict[str, float]:
    """Salidas promedio por día hábil en pico (7-10 y 18-21 h) en el mes de `at`, sin festivos."""
    import duckdb
    (p1a, p1b), (p2a, p2b) = PEAK_HOURS
    rows = duckdb.execute(PEAK_SQL, {
        "glob": str(data.trips_dir / "trips_*.parquet"), "at": at, "holidays": list(HOLIDAYS),
        "p1a": p1a, "p1b": p1b, "p2a": p2a, "p2b": p2b,
    }).fetchall()
    return {k: round(v, 1) for k, v in rows}


def priority(data: Data, at: datetime | None = None) -> list[dict]:
    """D3 · Prioridad de taller por estación (C2).

    Versión básica: sospechosas × salidas en pico. El factor "% del tiempo vacía" queda en
    None hasta que la Línea 1 publique el feed; entonces se multiplica también.
    """
    if data.mode == "EJEMPLO":
        return _example("c2_priority")
    at = (at or latest_time(data)).replace(tzinfo=None)
    suspected = suspected_by_station(ignored_bikes(data, at))
    peak = peak_departures(data, at)
    if not suspected:
        return []
    median_peak = sorted(peak.values())[len(peak) // 2] if peak else 0
    raw = {st: n * peak.get(st, 0) for st, n in suspected.items()}
    top = max(raw.values()) or 1
    ts = at.replace(tzinfo=CDMX).astimezone(timezone.utc).isoformat()
    items = []
    for st, n in suspected.items():
        signals = ["bici ignorada"]
        if peak.get(st, 0) > median_peak:
            signals.append("sale mucho en pico")
        items.append({
            "station_id": st,            # código del CSV; se cambia a station_id del feed con la tabla de L5
            "ts": ts,
            "suspected_expected": n,
            "priority_score": round(raw[st] / top, 3),
            "top_signals": signals,
            "peak_departures": peak.get(st, 0.0),
            "empty_share": None,
        })
    return sorted(items, key=lambda i: i["priority_score"], reverse=True)


def loss_risk(data: Data) -> list[dict]:
    """D4. En modo EJEMPLO devuelve el ejemplo de C6."""
    if data.mode == "EJEMPLO":
        return _example("c6_loss_risk")
    return []  # TODO D4
