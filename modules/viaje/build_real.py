"""Línea 3 · convierte los datos crudos del Drive en agregados chicos para el motor.

Uso (desde la raíz del repo, con los archivos del Drive en data/):

    python -m modules.viaje.build_real \
        --trips data/public_data_web_2026-09.csv data/public_data_web_2026-08_2.csv \
        --feed data/Sep.parquet \
        --info data/station_information.json

Escribe modules/viaje/real/ (sí se sube al repo: son promedios, sin bicis, edades ni géneros):
    stations.json   catálogo con station_id = número de la estación (el que ve la gente)
    states.json     estado C1 de cada estación el día demo a las 07:45 (desde el feed)
    baseline.json   salidas/llegadas promedio por estación, tipo de día y bloque de 15 min (28 días)
    travel.json     mediana de minutos entre pares de estaciones (>= 3 viajes)
    meta.json       qué se usó, fechas, conteos y avisos
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb

from .engine import CDMX, station_key

OUT = Path(__file__).parent / "real"
DEMO_DAY = date(2026, 9, 29)          # martes de la demo
DEMO_TIME = (7, 45)
DAYS = 28

ALIASES = {
    "genero_usuario": "gender", "edad_usuario": "age", "bici": "bike_id",
    "ciclo_estacion_retiro": "start_station", "ciclo_estacionretiro": "start_station",
    "fecha_retiro": "start_date", "hora_retiro": "start_time",
    "ciclo_estacion_arribo": "end_station", "ciclo_estacionarribo": "end_station",
    "fecha_arribo": "end_date", "hora_arribo": "end_time",
}
NEEDED = ["start_station", "start_date", "start_time", "end_station", "end_date", "end_time"]


def norm(col: str) -> str:
    col = unicodedata.normalize("NFKD", col).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", col.strip().lower()).strip("_")


def say(log: list, msg: str):
    print(msg)
    log.append(msg)


def ts_expr(d: str, t: str) -> str:
    """Fecha + hora del CSV en hora CDMX, aceptando dd/mm/aaaa, aaaa-mm-dd y dd/mm/aa."""
    s = f"trim({d}) || ' ' || trim({t})"
    return ("coalesce(" + ", ".join(f"try_strptime({s}, '{f}')" for f in (
        "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%y %H:%M:%S",
        "%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M")) + ")")


def load_trips(con, paths: list[str], log: list):
    parts = []
    for p in paths:
        with open(p, newline="", encoding="utf-8", errors="replace") as fh:
            header = next(csv.reader(fh))
        cols = {ALIASES.get(norm(c), norm(c)): c for c in header}
        missing = [c for c in NEEDED if c not in cols]
        if missing:
            say(log, f"⚠ {p}: faltan columnas {missing}. Encontré: {header}")
            continue
        q = lambda k: '"' + cols[k].replace('"', '""') + '"'  # noqa: E731
        parts.append(f"""
          SELECT {q('start_station')} AS s_raw, {q('end_station')} AS e_raw,
                 {ts_expr(q('start_date'), q('start_time'))} AS s_ts,
                 {ts_expr(q('end_date'), q('end_time'))} AS e_ts
          FROM read_csv('{p}', all_varchar = true, header = true, ignore_errors = true)""")
        say(log, f"Viajes: {p}")
    if not parts:
        raise SystemExit("No hay CSV de viajes utilizable.")
    con.create_function("skey", lambda x: station_key(x), ["VARCHAR"], "VARCHAR")
    con.execute(f"""CREATE TABLE trips AS
        SELECT skey(s_raw) AS sk, skey(e_raw) AS ek, s_ts, e_ts,
               date_diff('second', s_ts, e_ts) / 60.0 AS dur
        FROM ({' UNION ALL '.join(parts)}) WHERE s_ts IS NOT NULL""")
    n, bad, mn, mx = con.execute("""SELECT count(*), count(*) FILTER (e_ts IS NULL),
        min(s_ts), max(s_ts) FROM trips""").fetchone()
    say(log, f"  {n:,} viajes · {bad:,} sin fecha de llegada · {mn} → {mx} (hora CDMX)")


def build_baseline(con, keys: set[str], log: list):
    start, end = DEMO_DAY - timedelta(days=DAYS), DEMO_DAY - timedelta(days=1)
    rows = con.execute(f"""
      WITH ev AS (
        SELECT sk AS sid, s_ts AS ts, 1 AS o, 0 AS i FROM trips
          WHERE CAST(s_ts AS DATE) BETWEEN DATE '{start}' AND DATE '{end}'
        UNION ALL
        SELECT ek, e_ts, 0, 1 FROM trips
          WHERE e_ts IS NOT NULL AND CAST(e_ts AS DATE) BETWEEN DATE '{start}' AND DATE '{end}'),
      days AS (SELECT CASE WHEN isodow(d) >= 6 THEN 'weekend' ELSE 'weekday' END dt, count(*) n
               FROM (SELECT DISTINCT CAST(ts AS DATE) d FROM ev) GROUP BY 1)
      SELECT sid, dt, hour(ts) * 4 + minute(ts) // 15 AS blk,
             sum(o) / any_value(n) AS lo, sum(i) / any_value(n) AS li
      FROM ev JOIN days ON days.dt = CASE WHEN isodow(ev.ts) >= 6 THEN 'weekend' ELSE 'weekday' END
      GROUP BY ALL""").fetchall()
    out = [{"station_id": s, "day_type": dt, "block": int(b), "lam_out": round(lo, 3), "lam_in": round(li, 3)}
           for s, dt, b, lo, li in rows if s in keys and (lo or li)]
    say(log, f"Baseline {start} → {end}: {len(out):,} filas (estación × tipo de día × bloque)")
    return out


def build_travel(con, keys: set[str], log: list):
    start = DEMO_DAY - timedelta(days=DAYS)
    rows = con.execute(f"""
      SELECT sk, ek, median(dur), count(*) FROM trips
      WHERE dur BETWEEN 1 AND 90 AND sk <> ek AND CAST(s_ts AS DATE) >= DATE '{start}' - 31
      GROUP BY 1, 2 HAVING count(*) >= 3""").fetchall()
    out = [{"origin": a, "destination": b, "minutes": round(m, 1), "n": n}
           for a, b, m, n in rows if a in keys and b in keys]
    say(log, f"Tiempos de viaje: {len(out):,} pares con 3 o más viajes")
    return out


def load_info(path: str, log: list):
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    info = raw["data"]["stations"] if isinstance(raw, dict) and "data" in raw else raw
    stations, gbfs_to_key = [], {}
    for s in info:
        key = station_key(s.get("short_name") or s.get("name"))
        if not key:
            continue
        gbfs_to_key[str(s["station_id"])] = key
        stations.append({"station_id": key, "name": s.get("name", key), "lat": float(s["lat"]),
                         "lon": float(s["lon"]), "capacity": int(s.get("capacity") or 0)})
    say(log, f"Catálogo: {len(stations)} estaciones")
    return stations, gbfs_to_key


def build_states(con, feed: str, gbfs_to_key: dict, log: list):
    cols = [r[0] for r in con.execute(f"DESCRIBE SELECT * FROM read_parquet('{feed}')").fetchall()]
    tcol = next((c for c in ("committed_at_utc", "committed_at", "timestamp", "last_reported") if c in cols), None)
    if not tcol or "station_id" not in cols:
        say(log, f"⚠ Feed sin columna de tiempo o station_id. Columnas: {cols}")
        return []
    at_utc = datetime(*DEMO_DAY.timetuple()[:3], *DEMO_TIME, tzinfo=CDMX).astimezone(ZoneInfo("UTC"))
    t = f"CAST({tcol} AS TIMESTAMP)" if tcol != "last_reported" else f"to_timestamp({tcol})::TIMESTAMP"
    g = lambda c, d="0": c if c in cols else d  # noqa: E731
    rows = con.execute(f"""
      SELECT CAST(station_id AS VARCHAR), arg_max({t}, {t}),
             arg_max({g('num_bikes_available')}, {t}), arg_max({g('num_bikes_disabled')}, {t}),
             arg_max({g('num_docks_available')}, {t}), arg_max({g('num_docks_disabled')}, {t}),
             arg_max({g('is_renting', 'true')}, {t}), arg_max({g('is_returning', 'true')}, {t})
      FROM read_parquet('{feed}')
      WHERE {t} <= TIMESTAMP '{at_utc:%Y-%m-%d %H:%M:%S}'
        AND {t} >= TIMESTAMP '{at_utc - timedelta(hours=2):%Y-%m-%d %H:%M:%S}'
      GROUP BY 1""").fetchall()
    out = []
    for sid, ts, nb, nbd, nd, ndd, rent, ret in rows:
        key = gbfs_to_key.get(sid) or station_key(sid)
        out.append({"station_id": key, "ts": ts.replace(tzinfo=ZoneInfo("UTC")).isoformat(),
                    "useful_bikes": int(nb or 0), "bikes_disabled": int(nbd or 0),
                    "docks_available": int(nd or 0), "docks_disabled": int(ndd or 0),
                    "is_renting": bool(rent), "is_returning": bool(ret)})
    say(log, f"Estado a las {DEMO_TIME[0]}:{DEMO_TIME[1]:02d} del {DEMO_DAY} (≤ {at_utc:%H:%M} UTC): "
             f"{len(out)} estaciones")
    if not out:
        say(log, "⚠ El feed no tiene fotos de esa mañana. Prueba otro martes (8, 15 o 22 de sep).")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trips", nargs="+", required=True)
    ap.add_argument("--feed", required=True)
    ap.add_argument("--info", required=True)
    a = ap.parse_args()
    log: list[str] = []
    con = duckdb.connect()

    stations, gbfs_to_key = load_info(a.info, log)
    load_trips(con, a.trips, log)
    keys = {s["station_id"] for s in stations}
    trip_keys = {r[0] for r in con.execute("SELECT DISTINCT sk FROM trips").fetchall()}
    match = len(trip_keys & keys) / max(1, len(trip_keys)) * 100
    say(log, f"Códigos del CSV encontrados en el catálogo: {match:.1f}%")
    if match < 90:
        say(log, f"  ⚠ Sin pareja (ejemplo): {sorted(trip_keys - keys)[:10]}")

    states = build_states(con, a.feed, gbfs_to_key, log)
    with_state = {s["station_id"] for s in states}
    stations = [s for s in stations if s["station_id"] in with_state] or stations
    keys = {s["station_id"] for s in stations}

    OUT.mkdir(exist_ok=True)
    files = {
        "stations.json": stations,
        "states.json": states,
        "baseline.json": build_baseline(con, keys, log),
        "travel.json": build_travel(con, keys, log),
    }
    for name, data in files.items():
        (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    meta = {"demo_day": str(DEMO_DAY), "demo_time": f"{DEMO_TIME[0]:02d}:{DEMO_TIME[1]:02d}",
            "baseline_days": DAYS, "sources": [Path(p).name for p in [*a.trips, a.feed, a.info]],
            "built_at_utc": datetime.now(ZoneInfo("UTC")).isoformat(timespec="seconds"), "log": log}
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    size = sum((OUT / n).stat().st_size for n in files) // 1024
    print(f"\n✔ modules/viaje/real/ listo ({size} KB). Sube esa carpeta; data/ NO.")


if __name__ == "__main__":
    main()
