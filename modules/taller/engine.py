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
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from shared.contracts import station_ids

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = REPO_ROOT / "shared" / "contracts"

IGNORED_MIN_DEPARTURES = 30      # salidas de otras bicis mientras la bici sigue anclada
IGNORED_WINDOW_H = 24
IGNORED_MAX_AGE_H = 72          # anclada más tiempo: probablemente ya la retiraron
LOST_AFTER_DAYS = 21
PEAK_HOURS = ((7, 10), (18, 21))   # hora CDMX, días hábiles
HOLIDAYS = ("2026-09-16",)
CDMX = ZoneInfo("America/Mexico_City")
HERE = Path(__file__).resolve().parent
REAL_DIR = HERE / "real"          # snapshot exportado (se sube a git; chico)
DEMO_AT = datetime(2026, 9, 29, 7, 45)   # mismo momento que usa la Línea 3


@dataclass
class Data:
    mode: str                      # "EJEMPLO" | "REAL"
    trips_dir: Path | None = None
    reports: list[dict] = field(default_factory=list)   # D5
    snapshot_dir: Path | None = None                    # sin DATA_DIR: usa REAL_DIR (Railway)
    reports_file: Path | None = None                     # REAL: se guardan en DATA_DIR/reports/
    _stations: set[str] | None = None


def _example(name: str) -> list[dict]:
    return json.loads((CONTRACTS / f"{name}.example.json").read_text(encoding="utf-8"))


def load() -> Data:
    data_dir = (os.getenv("DATA_DIR") or "").strip()
    if data_dir:
        trips = Path(data_dir).resolve() / "trips"
        if any(trips.glob("trips_*.parquet")):
            logging.info("taller: modo REAL con %s", trips)
            reports_file = trips.parent / "reports" / "reports.jsonl"
            return Data(mode="REAL", trips_dir=trips, reports_file=reports_file,
                        reports=_read_reports(reports_file))
        logging.warning("taller: DATA_DIR=%r no tiene trips/trips_*.parquet; uso EJEMPLO", data_dir)
    if (REAL_DIR / "c2_priority.json").exists() and os.getenv("TALLER_MODE", "").lower() != "ejemplo":
        logging.info("taller: modo REAL con el snapshot de %s", REAL_DIR)
        return Data(mode="REAL", snapshot_dir=REAL_DIR)
    logging.info("taller: modo EJEMPLO")
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
    if data.mode != "REAL" or data.trips_dir is None:
        return None
    import duckdb
    glob = str(data.trips_dir / "trips_*.parquet")
    return duckdb.execute("SELECT max(start_local) FROM read_parquet(?)", [glob]).fetchone()[0]


# ---------- Ids de estación ----------
def feed_ids() -> dict[str, str]:
    """Código CE del CSV (271-272) -> station_id del feed. Mapa único: shared/contracts/stations_map.json."""
    return station_ids.ce_to_feed_map()


def with_ids(item: dict, key: str, ids: str = "ce") -> dict:
    """Pone station_id (código CE por defecto, o el id del feed) y deja el código CE en short_name."""
    item["short_name"] = key
    item["station_id"] = feed_ids().get(key, key) if ids == "feed" else key
    return item


# ---------- D5 · Reportes ----------
REPORT_DEDUPE_MIN = 30           # mismo usuario, estación, bici y tipo: cuenta una sola vez
WITHDRAWAL_DISCARD_MIN = 5       # reporte y retiro de la misma bici por el mismo usuario en 5 min: se descarta
CONFIDENCE_BASE = {"taller": 0.9, "deteccion": 0.6, "usuario": 0.5}
CORROBORATION_H = 24             # otra persona reportando lo mismo en 24 h sube la confianza
MIN_CONFIDENCE = 0.5             # por debajo no cuenta como señal en la prioridad
RECENT_REPORTS_H = 24            # reportes que se vuelven señal en la prioridad


def _read_reports(path: Path) -> list[dict]:
    if not path.exists():
        return []
    by_id: dict[str, dict] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            by_id[r["report_id"]] = r          # el archivo solo agrega: gana la última versión
    return list(by_id.values())


def _save(data: Data, report: dict) -> None:
    if data.reports_file is not None:
        data.reports_file.parent.mkdir(parents=True, exist_ok=True)
        with data.reports_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(report, ensure_ascii=False) + "\n")


def known_stations(data: Data) -> set[str] | None:
    """Códigos de estación vistos en los viajes. None en modo EJEMPLO (no se valida)."""
    if data.mode != "REAL":
        return None
    if data.trips_dir is None:      # snapshot: aceptamos código CE o station_id del feed
        return set(feed_ids()) | set(feed_ids().values())
    if data._stations is None:
        import duckdb
        glob = str(data.trips_dir / "trips_*.parquet")
        rows = duckdb.execute(
            "SELECT DISTINCT start_key FROM read_parquet(?) WHERE start_key IS NOT NULL "
            "UNION SELECT DISTINCT end_key FROM read_parquet(?) WHERE end_key IS NOT NULL",
            [glob, glob]).fetchall()
        data._stations = {r[0] for r in rows} | set(feed_ids().values())
    return data._stations


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value)


def add_report(data: Data, report: dict) -> tuple[dict, bool]:
    """Guarda un reporte. Devuelve (reporte, nuevo). Si es duplicado reciente, devuelve el original."""
    created = _parse_ts(report["created_at"])
    for r in reversed(data.reports):
        if (r["station_id"], r.get("bike_id"), r["type"], r.get("user_hash")) == (
                report["station_id"], report.get("bike_id"), report["type"], report.get("user_hash")) \
                and report.get("user_hash") is not None \
                and (created - _parse_ts(r["created_at"])).total_seconds() < REPORT_DEDUPE_MIN * 60:
            return r, False
    report.setdefault("status", "valido")
    data.reports.append(report)
    _save(data, report)
    return report, True


def register_withdrawal(data: Data, bike_id: str, user_hash: str, taken_at: datetime) -> list[dict]:
    """Descarta los reportes de la misma persona sobre esa bici hechos hasta 5 min antes de retirarla.

    Es la forma de apartar una bici: se reporta como dañada para que nadie más la tome y luego se usa.
    Devuelve los reportes descartados.
    """
    dropped = []
    for r in data.reports:
        if r.get("status") == "descartado" or r.get("bike_id") != bike_id or r.get("user_hash") != user_hash:
            continue
        gap = (taken_at - _parse_ts(r["created_at"])).total_seconds()
        if 0 <= gap <= WITHDRAWAL_DISCARD_MIN * 60:
            r["status"] = "descartado"
            r["discard_reason"] = f"La misma persona retiró la bici {WITHDRAWAL_DISCARD_MIN} min o menos después de reportarla"
            _save(data, r)
            dropped.append(r)
    return dropped


def confidence(report: dict, reports: list[dict]) -> float:
    """0 a 1. Base por fuente, +0.2 si otra persona reportó lo mismo en 24 h, 0 si se descartó.

    Es una señal interna para ordenar el taller: no se publica por persona ni genera multas.
    """
    if report.get("status") == "descartado":
        return 0.0
    score = CONFIDENCE_BASE.get(report.get("source", "usuario"), 0.5)
    here = _parse_ts(report["created_at"])
    for o in reports:
        if (o is not report and o.get("status") != "descartado" and o["station_id"] == report["station_id"]
                and o.get("user_hash") != report.get("user_hash")
                and (o.get("bike_id") == report.get("bike_id") or report.get("bike_id") is None)
                and abs((_parse_ts(o["created_at"]) - here).total_seconds()) <= CORROBORATION_H * 3600):
            score += 0.2
            break
    return round(min(score, 1.0), 2)


def list_reports(data: Data, station_id: str | None = None) -> list[dict]:
    items = [{**r, "confidence": confidence(r, data.reports)}
             for r in data.reports if station_id is None or r["station_id"] == station_id]
    return sorted(items, key=lambda r: r["created_at"], reverse=True)


def recent_reports_by_station(data: Data, at_utc: datetime) -> dict[str, int]:
    """Reportes válidos y con confianza suficiente de las últimas 24 h hasta `at_utc`, por estación."""
    counts: dict[str, int] = {}
    for r in data.reports:
        if r.get("status") == "descartado" or confidence(r, data.reports) < MIN_CONFIDENCE:
            continue
        age_h = (at_utc - _parse_ts(r["created_at"])).total_seconds() / 3600
        if 0 <= age_h < RECENT_REPORTS_H:
            counts[r["station_id"]] = counts.get(r["station_id"], 0) + 1
    return counts


def ignored_bikes(data: Data, at: datetime | None = None) -> list[dict]:
    """D2 · Bici ignorada: sigue anclada mientras salieron >=30 bicis de su estación en 24 h.

    `at` va en hora CDMX sin zona (igual que start_local). Es una señal, no un diagnóstico:
    la bici probablemente no sirve, nadie la eligió.
    """
    if data.mode != "REAL" or data.trips_dir is None:
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


def _snapshot(data: Data, name: str) -> list[dict]:
    """Lee un archivo exportado (modo sin DATA_DIR). Ignora `at`: es la foto del día demo."""
    path = data.snapshot_dir / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def priority(data: Data, at: datetime | None = None, ids: str = "ce") -> list[dict]:
    """D3 · Prioridad de taller por estación (C2).

    Versión básica: sospechosas × salidas en pico. El factor "% del tiempo vacía" queda en
    None hasta que la Línea 1 publique el feed; entonces se multiplica también.
    """
    if data.mode == "EJEMPLO":
        return _example("c2_priority")
    if data.trips_dir is None:
        return _snapshot(data, "c2_priority.feed.json" if ids == "feed" else "c2_priority.json")
    at = (at or latest_time(data)).replace(tzinfo=None)
    suspected = suspected_by_station(ignored_bikes(data, at))
    peak = peak_departures(data, at)
    if not suspected:
        return []
    median_peak = sorted(peak.values())[len(peak) // 2] if peak else 0
    raw = {st: n * peak.get(st, 0) for st, n in suspected.items()}
    top = max(raw.values()) or 1
    at_utc = at.replace(tzinfo=CDMX).astimezone(timezone.utc)
    ts = at_utc.isoformat()
    reported = recent_reports_by_station(data, at_utc)
    items = []
    for st, n in suspected.items():
        signals = ["bici ignorada"]
        if peak.get(st, 0) > median_peak:
            signals.append("sale mucho en pico")
        if reported.get(st):
            signals.append("reportada por usuarios")
        items.append(with_ids({
            "ts": ts,
            "suspected_expected": n,
            "priority_score": round(raw[st] / top, 3),
            "top_signals": signals,
            "peak_departures": peak.get(st, 0.0),
            "empty_share": None,
        }, st, ids))
    return sorted(items, key=lambda i: i["priority_score"], reverse=True)


LOSS_SQL = """
WITH t AS (
    SELECT CAST(bike_id AS VARCHAR) AS bike_id, start_local, end_key, end_local
    FROM read_parquet($glob)
    WHERE start_local IS NOT NULL AND end_local IS NOT NULL AND start_local <= $at
),
last AS (                        -- último viaje de cada bici hasta `at`
    SELECT bike_id,
           arg_max(end_key, end_local) AS station_key,
           max(end_local) AS last_arrival,
           max(start_local) AS last_start
    FROM t GROUP BY bike_id
)
SELECT station_key,
       CASE
        WHEN hour(last_arrival) < 7 THEN '00:00-07:00'
        WHEN hour(last_arrival) < 10 THEN '07:00-10:00'
        WHEN hour(last_arrival) < 18 THEN '10:00-18:00'
        WHEN hour(last_arrival) < 21 THEN '18:00-21:00'
        ELSE '21:00-24:00'
       END AS time_band,
       COUNT(*) AS disappeared_bikes
FROM last
WHERE station_key IS NOT NULL
  AND last_start <= last_arrival                    -- no salió después de llegar
  AND last_arrival <= $at - INTERVAL (CAST($lost AS INTEGER)) DAY
GROUP BY ALL
ORDER BY disappeared_bikes DESC, station_key
"""


VALIDATION_SQL = """
WITH t AS (
    SELECT CAST(bike_id AS VARCHAR) AS bike_id, start_key, start_local, end_key, end_local
    FROM read_parquet($glob)
    WHERE start_local IS NOT NULL AND end_local IS NOT NULL
),
docked AS (
    SELECT bike_id, end_key AS station_key, end_local AS docked_since,
           LEAD(start_local) OVER (PARTITION BY bike_id ORDER BY start_local) AS next_out
    FROM t
),
nd AS (                           -- ancladas en `at` desde hace menos de 72 h
    SELECT * FROM docked
    WHERE docked_since <= $at AND docked_since > $at - INTERVAL 72 HOUR
      AND (next_out IS NULL OR next_out > $at) AND station_key IS NOT NULL
),
dep AS (
    SELECT start_key AS station_key, start_local FROM t
    WHERE start_local > $at - INTERVAL 24 HOUR AND start_local <= $at
),
flag AS (
    SELECT n.bike_id FROM nd n
    JOIN dep d ON d.station_key = n.station_key AND d.start_local >= n.docked_since
    GROUP BY n.bike_id HAVING COUNT(*) >= $min_dep
)
SELECT f.bike_id IS NOT NULL AS flagged, COUNT(*) AS n,
       SUM(CASE WHEN nd.next_out IS NULL OR nd.next_out > $at + INTERVAL 72 HOUR THEN 1 ELSE 0 END) AS gone
FROM nd LEFT JOIN flag f ON f.bike_id = nd.bike_id
GROUP BY 1
"""


def validation(data: Data, days: list[datetime] | None = None) -> dict:
    """D2 · Validación: ¿las bicis ignoradas desaparecen más de 72 h con más frecuencia que las demás?

    Para cada momento, toma las bicis ancladas hace menos de 72 h; las ignoradas son las que cumplen
    la regla de D2 y "las demás" el resto. Después mira si cada una vuelve a salir en las siguientes 72 h.
    """
    if data.mode != "REAL":
        return {}
    if data.trips_dir is None:
        path = data.snapshot_dir / "validation.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    import duckdb
    glob = str(data.trips_dir / "trips_*.parquet")
    end = duckdb.execute("SELECT max(start_local) FROM read_parquet(?)", [glob]).fetchone()[0]
    if days is None:   # días hábiles de septiembre a las 8:00, con 72 h de seguimiento disponibles
        d = datetime(2026, 9, 1, 8)
        days = []
        while d + timedelta(hours=72) <= end:
            if d.weekday() < 5 and d.strftime("%Y-%m-%d") not in HOLIDAYS:
                days.append(d)
            d += timedelta(days=1)
    tot = {True: [0, 0], False: [0, 0]}      # flagged -> [bicis, desaparecidas >72 h]
    for at in days:
        for flagged, n, gone in duckdb.execute(VALIDATION_SQL, {
                "glob": glob, "at": at, "min_dep": IGNORED_MIN_DEPARTURES}).fetchall():
            tot[bool(flagged)][0] += n
            tot[bool(flagged)][1] += int(gone or 0)
    rate = lambda a: (a[1] / a[0]) if a[0] else None  # noqa: E731
    ig, rest = rate(tot[True]), rate(tot[False])
    return {
        "moments": [d.isoformat(timespec="minutes") for d in days],
        "ignored": {"bikes": tot[True][0], "gone_72h": tot[True][1], "rate": ig},
        "others": {"bikes": tot[False][0], "gone_72h": tot[False][1], "rate": rest},
        "ratio": round(ig / rest, 1) if ig is not None and rest else None,
        "definition": "Ancladas hace menos de 72 h; 'desaparece' = no vuelve a salir en las siguientes 72 h. "
                      "Es una señal, no un diagnóstico.",
    }


def loss_risk(data: Data, at: datetime | None = None, ids: str = "ce") -> list[dict]:
    """D4 · Bicis que dejan de aparecer (C6).

    Cuenta, por estación y franja de su último arribo, las bicis que llegaron ahí y no
    vuelven a salir en 3 semanas o más hasta `at`. Es riesgo, no robo comprobado: también
    entran bicis retiradas al taller sin registro público.
    """
    if data.mode == "EJEMPLO":
        return _example("c6_loss_risk")
    if data.trips_dir is None:
        return _snapshot(data, "c6_loss_risk.feed.json" if ids == "feed" else "c6_loss_risk.json")
    import duckdb
    at = (at or latest_time(data)).replace(tzinfo=None)
    rows = duckdb.execute(LOSS_SQL, {
        "glob": str(data.trips_dir / "trips_*.parquet"), "at": at, "lost": LOST_AFTER_DAYS,
    }).fetchall()
    return [
        with_ids({"time_band": band, "disappeared_bikes": n, "note": "riesgo, no robo comprobado"}, st, ids)
        for st, band, n in rows
    ]
