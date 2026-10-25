"""
Línea 3 · Viaje del ciclista: pronóstico de bici útil y anclaje a la llegada,
y recomendación de estación alternativa con minutos de gracia.

Modos:
- REAL (si existe modules/viaje/real/): agregados de sep 2026 hechos con build_real.py.
- EJEMPLO (respaldo, o VIAJE_MODE=ejemplo): modules/viaje/fixtures/*.json, 6 estaciones inventadas.

Método (V2): para cada estación, bloque de 15 min y tipo de día, el baseline da las
salidas (lam_out) y llegadas (lam_in) promedio. Desde el inventario útil de ahora se
simulan 500 escenarios con Poisson hasta la hora de llegada, recortando entre 0 y la
capacidad efectiva. p_useful_bike = escenarios con >= 1 bici; p_free_dock = escenarios
con >= 1 anclaje libre.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np

CDMX = ZoneInfo("America/Mexico_City")
HERE = Path(__file__).parent
N_SCENARIOS = 500
WALK_M_PER_MIN = 75          # ~4.5 km/h
BIKE_KMH = 12                # respaldo si no hay duración real entre el par
GREEN, YELLOW = 0.80, 0.50   # umbrales del semáforo (a calibrar)


# ---------------------------------------------------------------- utilidades
def haversine_m(lat1, lon1, lat2, lon2) -> float:
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def block_of(ts: datetime) -> int:
    ts = ts.astimezone(CDMX)
    return ts.hour * 4 + ts.minute // 15


def day_type(ts: datetime) -> str:
    return "weekend" if ts.astimezone(CDMX).weekday() >= 5 else "weekday"


def traffic_light(p: float) -> str:
    return "verde" if p >= GREEN else "amarillo" if p >= YELLOW else "rojo"


def grace_minutes(detour_min: float) -> int:
    """Regla propuesta: el mayor entre 10 min y el doble del desvío."""
    return int(max(10, math.ceil(2 * detour_min)))


# ---------------------------------------------------------------- datos
@dataclass
class Station:
    station_id: str
    name: str
    lat: float
    lon: float
    capacity: int


@dataclass
class State:
    """Estado de una estación ahora (contratos C1 y C2)."""
    station_id: str
    ts: str
    useful_bikes: int
    docks_available: int
    docks_disabled: int = 0
    is_renting: bool = True
    is_returning: bool = True
    suspected_expected: float = 0.0   # C2, Línea 2


@dataclass
class Data:
    stations: dict[str, Station]
    states: dict[str, State]
    # (station_id, day_type, block) -> (lam_out, lam_in)
    baseline: dict[tuple[str, str, int], tuple[float, float]]
    # (origen, destino) -> minutos (mediana real)
    travel: dict[tuple[str, str], float] = field(default_factory=dict)
    mode: str = "EJEMPLO"


def _read(path: Path):
    """Lee .json o .json.gz; acepta lista de dicts o tabla compacta {"cols", "rows"}."""
    import gzip
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    elif path.with_name(path.name + ".gz").exists():
        with gzip.open(path.with_name(path.name + ".gz"), "rt", encoding="utf-8") as fh:
            data = json.load(fh)
    else:
        return None
    if isinstance(data, dict) and "cols" in data:
        return [dict(zip(data["cols"], r)) for r in data["rows"]]
    return data


def _load_dir(f: Path, names: dict[str, str], mode: str) -> Data:
    st = {s["station_id"]: Station(**{k: s[k] for k in ("station_id", "name", "lat", "lon", "capacity")})
          for s in _read(f / names["stations"])}
    states = {}
    for s in _read(f / names["states"]):
        states[s["station_id"]] = State(
            station_id=s["station_id"], ts=s["ts"], useful_bikes=s["useful_bikes"],
            docks_available=s["docks_available"], docks_disabled=s.get("docks_disabled", 0),
            is_renting=s.get("is_renting", True), is_returning=s.get("is_returning", True))
    for p in (_read(f / names["c2"]) if names.get("c2") else None) or []:
        if p["station_id"] in states:
            states[p["station_id"]].suspected_expected = p["suspected_expected"]
    base = {}
    for b in _read(f / names["baseline"]):
        base[(b["station_id"], b["day_type"], b["block"])] = (b["lam_out"], b["lam_in"])
    travel = {(t["origin"], t["destination"]): t["minutes"]
              for t in _read(f / names["travel"])}
    return Data(st, states, base, travel, mode)


def load_fixtures() -> Data:
    """Fixtures de EJEMPLO: 6 estaciones inventadas, siempre disponibles (pruebas y respaldo)."""
    return _load_dir(HERE / "fixtures", {
        "stations": "stations.json", "states": "c1_useful_bikes.example.json",
        "c2": "c2_priority.example.json", "baseline": "baseline.example.json",
        "travel": "travel.example.json"}, "EJEMPLO")


REAL_DIR = HERE / "real"


def load_real() -> Data | None:
    """Agregados reales generados con `python -m modules.viaje.build_real` (sep 2026)."""
    if not (REAL_DIR / "meta.json").exists():
        return None
    d = _load_dir(REAL_DIR, {"stations": "stations.json", "states": "states.json",
                             "c2": "c2_priority.json", "baseline": "baseline.json",
                             "travel": "travel.json"}, "REAL")
    import re
    d.stations = {k: v for k, v in d.stations.items() if k in d.states}
    for st in d.stations.values():  # "CE-271-272 Jesús García - …" → "Jesús García - …"
        st.name = re.sub(r"^CE-?[\w-]+\s+", "", st.name).strip() or st.name
    return d


def build_baseline_from_trips(trips_glob: str, end_date: str | None = None, days: int = 28):
    """V1 + V2 con datos reales (rama `data`). Devuelve (baseline, travel)."""
    import duckdb
    con = duckdb.connect()
    end = f"DATE '{end_date}'" if end_date else "(SELECT max(CAST(start_local AS DATE)) FROM t)"
    con.execute(f"CREATE VIEW t AS SELECT * FROM read_parquet('{trips_glob}')")
    q = f"""
    WITH win AS (SELECT {end} AS e),
    ev AS (
      SELECT start_key AS sid, start_local AS ts, 1 AS o, 0 AS i FROM t, win
        WHERE CAST(start_local AS DATE) BETWEEN e - {days} AND e - 1
      UNION ALL
      SELECT end_key, end_local, 0, 1 FROM t, win
        WHERE CAST(end_local AS DATE) BETWEEN e - {days} AND e - 1),
    agg AS (
      SELECT sid, CAST(ts AS DATE) d,
             CASE WHEN isodow(ts) >= 6 THEN 'weekend' ELSE 'weekday' END dt,
             hour(ts) * 4 + minute(ts) // 15 AS blk, sum(o) so, sum(i) si
      FROM ev GROUP BY ALL),
    ndays AS (
      SELECT CASE WHEN isodow(d) >= 6 THEN 'weekend' ELSE 'weekday' END dt, count(*) n
      FROM (SELECT DISTINCT CAST(ts AS DATE) d FROM ev) GROUP BY 1)
    SELECT a.sid, a.dt, a.blk, sum(so) / any_value(n) lo, sum(si) / any_value(n) li
    FROM agg a JOIN ndays USING (dt) GROUP BY ALL
    """
    base = {(r[0], r[1], int(r[2])): (float(r[3]), float(r[4])) for r in con.execute(q).fetchall()}
    tr = con.execute("""
      SELECT start_key, end_key, median(duration_min) FROM t
      WHERE duration_min BETWEEN 1 AND 90 GROUP BY 1, 2 HAVING count(*) >= 3""").fetchall()
    travel = {(a, b): float(m) for a, b, m in tr}
    return base, travel


GBFS_ROOT = "https://gbfs.mex.lyftbikes.com/gbfs/en"


def station_key(x) -> str | None:
    """Mismo criterio que prepare_data.py: 'CE-014' -> '14', '271-272' -> '271-272'."""
    import re
    if x is None:
        return None
    s = str(x).strip().upper().replace("CE-", "").replace("CE", "")
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"\.0$", "", s)
    s = "-".join(p.lstrip("0") or "0" if p.isdigit() else p for p in s.split("-"))
    return s or None


def load_live(fetch=None) -> tuple[dict, dict, dict]:
    """Estaciones y estado ACTUAL desde el feed GBFS en vivo (dos JSON chicos)."""
    import requests
    fetch = fetch or (lambda name: requests.get(f"{GBFS_ROOT}/{name}.json", timeout=20).json())
    info = fetch("station_information")["data"]["stations"]
    status = {s["station_id"]: s for s in fetch("station_status")["data"]["stations"]}
    stations, states = {}, {}
    for s in info:
        sid = str(s["station_id"])
        st = status.get(s["station_id"])
        if not st or not st.get("is_installed", 1):
            continue
        stations[sid] = Station(sid, s.get("name", sid), float(s["lat"]), float(s["lon"]),
                                int(s.get("capacity") or 0))
        ts = datetime.fromtimestamp(int(st.get("last_reported", 0)), ZoneInfo("UTC")).isoformat()
        states[sid] = State(
            station_id=sid, ts=ts,
            useful_bikes=int(st.get("num_bikes_available", 0)),       # ya excluye deshabilitadas
            docks_available=int(st.get("num_docks_available", 0)),
            docks_disabled=int(st.get("num_docks_disabled", 0) or 0),
            is_renting=bool(st.get("is_renting", 1)), is_returning=bool(st.get("is_returning", 1)))
    # equivalencia código del CSV -> station_id, para unir con el baseline
    keymap = {station_key(s.get("short_name") or s.get("name")): str(s["station_id"]) for s in info}
    return stations, states, keymap


# Sin LIVE, "ahora" es la mañana de la demo: el estado de real/ es del martes 29 sep ~7:40.
REPLAY_AT = datetime(2026, 9, 29, 7, 45, tzinfo=CDMX)


def merge_live(real: Data, live_stations: dict, live_states: dict, keymap: dict) -> Data:
    """Estado de AHORA (feed GBFS) + promedios reales de real/. Une por número de estación."""
    inv = {gid: key for key, gid in keymap.items() if key}
    states = {}
    for gid, st in live_states.items():
        key = inv.get(gid)
        if key in real.stations:
            states[key] = State(key, st.ts, st.useful_bikes, st.docks_available, st.docks_disabled,
                                st.is_renting, st.is_returning, real.states[key].suspected_expected
                                if key in real.states else 0.0)
    real.states = states
    real.stations = {k: v for k, v in real.stations.items() if k in states}
    real.mode = "VIVO + baseline REAL"
    return real


def load() -> Data:
    """Orden: VIAJE_MODE=ejemplo fuerza fixtures; si existe real/ se usa (REAL, repite el martes 29);
    con LIVE=1 además usa el estado de ahorita (VIVO + baseline REAL);
    DATA_DIR → baseline desde parquet de la rama data."""
    if os.getenv("VIAJE_MODE", "").lower() != "ejemplo":
        real = load_real()
        if real and os.getenv("LIVE") == "1":
            try:
                return merge_live(real, *load_live())
            except Exception as e:  # sin internet: se queda con la repetición
                print(f"[viaje] LIVE no disponible ({e}); uso datos reales del 29 sep")
                real = load_real()
        if real:
            return real
    d = load_fixtures()
    keymap = None
    if os.getenv("LIVE") == "1":
        d.stations, d.states, keymap = load_live()
        d.mode = "VIVO + baseline de EJEMPLO"
    data_dir = os.getenv("DATA_DIR")
    if data_dir:
        base, travel = build_baseline_from_trips(str(Path(data_dir) / "trips" / "*.parquet"))
        if keymap:  # pasar de códigos del CSV a station_id del feed
            base = {(keymap[k], dt, b): v for (k, dt, b), v in base.items() if k in keymap}
            travel = {(keymap[a], keymap[b]): m for (a, b), m in travel.items()
                      if a in keymap and b in keymap}
        d.baseline, d.travel = base, travel
        d.mode = "REAL" if keymap else "baseline REAL + estaciones de EJEMPLO"
    return d


# ---------------------------------------------------------------- V2 · pronóstico
def simulate(data: Data, sid: str, start: datetime, minutes: float,
             n: int = N_SCENARIOS, seed: int = 42) -> dict:
    """Probabilidad de >=1 bici útil y >=1 anclaje libre dentro de `minutes`."""
    st, s = data.stations[sid], data.states[sid]
    cap = max(0, st.capacity - s.docks_disabled)
    b0 = max(0, min(cap, round(s.useful_bikes - s.suspected_expected)))
    # Anclajes libres: se parte de los que reporta el feed. Las bicis descompuestas también
    # ocupan anclaje, así que "capacidad − bicis útiles" sobrestimaría el lugar disponible.
    d0 = max(0, min(cap, s.docks_available))
    rng = np.random.default_rng(seed)
    inv = np.full(n, b0, dtype=float)
    free = np.full(n, d0, dtype=float)
    t, left = start, minutes
    while left > 1e-9:
        frac = min(1.0, left / 15)
        lo, li = data.baseline.get((sid, day_type(t), block_of(t)), (0.0, 0.0))
        delta = rng.poisson(li * frac, n) - rng.poisson(lo * frac, n)   # llegadas − salidas
        inv = np.clip(inv + delta, 0, cap)
        free = np.clip(free - delta, 0, cap)
        t += timedelta(minutes=15 * frac)
        left -= 15 * frac
    p_bike = float(np.mean(inv >= 1)) if s.is_renting else 0.0
    p_dock = float(np.mean(free >= 1)) if s.is_returning else 0.0
    return {"p_useful_bike": round(p_bike, 3), "p_free_dock": round(p_dock, 3),
            "expected_bikes": round(float(inv.mean()), 1), "capacity_effective": cap}


def forecast(data: Data, sid: str, now: datetime, horizons=(15, 30, 60)) -> list[dict]:
    """Contrato C3."""
    out = []
    for h in horizons:
        r = simulate(data, sid, now, h)
        out.append({"station_id": sid, "ts": now.astimezone(ZoneInfo("UTC")).isoformat(),
                    "horizon_min": h, "p_useful_bike": r["p_useful_bike"],
                    "p_free_dock": r["p_free_dock"]})
    return out


# ---------------------------------------------------------------- V3 · recomendación
def travel_minutes(data: Data, a: str, b: str) -> tuple[float, str]:
    if (a, b) in data.travel:
        return data.travel[(a, b)], "mediana de viajes" + (" (EJEMPLO)" if "EJEMPLO" in data.mode else "")
    sa, sb = data.stations[a], data.stations[b]
    return haversine_m(sa.lat, sa.lon, sb.lat, sb.lon) / 1000 / BIKE_KMH * 60, "distancia a 12 km/h"


def pct(p: float) -> int:
    """Nunca prometemos 0% ni 100%: es una probabilidad, no una garantía."""
    return 0 if p <= 0 else min(99, max(1, round(p * 100)))


def _label_bike(p, mins):
    return f"{pct(p)}% de que haya bici útil en {round(mins)} min"


def _label_dock(p, mins):
    return f"{pct(p)}% de que haya lugar al llegar en {round(mins)} min"


def recommend(data: Data, origin: str, destination: str, now: datetime,
              walk_to_origin_min: float = 3, max_walk_min: float = 5,
              accept_alternative: bool = True, avoid_effort: bool = False) -> dict:
    """Evalúa el viaje y, si hace falta, propone estaciones alternativas."""
    if avoid_effort:
        max_walk_min = min(max_walk_min, 2)
    data_ts = data.states[origin].ts

    # Origen: ¿habrá bici útil cuando llegue caminando?
    o = simulate(data, origin, now, walk_to_origin_min)
    origin_info = {"station_id": origin, "name": data.stations[origin].name,
                   "p_useful_bike": o["p_useful_bike"], "light": traffic_light(o["p_useful_bike"]),
                   "text": _label_bike(o["p_useful_bike"], walk_to_origin_min)}

    # Si en el origen podría no haber bici: estaciones cercanas al origen con más probabilidad
    origin_alts = []
    if o["p_useful_bike"] < GREEN:
        so = data.stations[origin]
        for sid, st in data.stations.items():
            s = data.states.get(sid)
            if sid in (origin, destination) or not s or not s.is_renting:
                continue
            extra = haversine_m(st.lat, st.lon, so.lat, so.lon) / WALK_M_PER_MIN
            if extra > max_walk_min:
                continue
            p = simulate(data, sid, now, walk_to_origin_min + extra)["p_useful_bike"]
            if p <= o["p_useful_bike"]:
                continue
            origin_alts.append({
                "station_id": sid, "name": st.name, "extra_walk_min": round(extra, 1),
                "p_useful_bike": p, "light": traffic_light(p), "useful_bikes_now": s.useful_bikes,
                "score": round(p - 0.03 * extra, 3),
                "text": f"Sal de la estación {sid} ({st.name}): {pct(p)}% de bici útil, "
                        f"{max(1, round(extra))} min más caminando"})
        origin_alts.sort(key=lambda a: -a["score"])
        origin_alts = origin_alts[:3]
    origin_info["useful_bikes_now"] = data.states[origin].useful_bikes

    # Destino: ¿habrá lugar al llegar?
    ride, ride_src = travel_minutes(data, origin, destination)
    arrive = now + timedelta(minutes=walk_to_origin_min + ride)
    d = simulate(data, destination, now, walk_to_origin_min + ride)
    dest_info = {"station_id": destination, "name": data.stations[destination].name,
                 "ride_min": round(ride, 1), "ride_source": ride_src,
                 "arrival_local": arrive.astimezone(CDMX).strftime("%H:%M"),
                 "p_free_dock": d["p_free_dock"], "light": traffic_light(d["p_free_dock"]),
                 "text": _label_dock(d["p_free_dock"], walk_to_origin_min + ride)}

    alternatives = []
    needs_alt = d["p_free_dock"] < GREEN
    if needs_alt and accept_alternative:
        dst = data.stations[destination]
        for sid, st in data.stations.items():
            if sid in (origin, destination):
                continue
            s = data.states.get(sid)
            if not s or not s.is_returning:
                continue
            walk = haversine_m(st.lat, st.lon, dst.lat, dst.lon) / WALK_M_PER_MIN
            if walk > max_walk_min:
                continue
            r2, _ = travel_minutes(data, origin, sid)
            p = simulate(data, sid, now, walk_to_origin_min + r2)["p_free_dock"]
            if p <= d["p_free_dock"]:
                continue
            detour = max(0.0, r2 + walk - ride)
            alternatives.append({
                "station_id": sid, "name": st.name, "walk_to_destination_min": round(walk, 1),
                "p_free_dock": p, "light": traffic_light(p), "detour_min": round(detour, 1),
                "grace_min": grace_minutes(detour),
                "score": round(p - 0.03 * walk, 3),
                "text": f"Déjala en {st.name}: {pct(p)}% de lugar, "
                        f"a {round(walk)} min caminando de tu destino. +{grace_minutes(detour)} min de gracia"})
        alternatives.sort(key=lambda a: -a["score"])

    if origin_alts:
        advice_origin = origin_alts[0]["text"] + ". "
    elif o["p_useful_bike"] < YELLOW:
        advice_origin = "Tu estación de salida podría no tener bici y no hay otra cerca con más probabilidad. "
    else:
        advice_origin = ""
    if not needs_alt:
        advice = "Tu destino tiene lugar. Buen viaje."
    elif not accept_alternative:
        advice = "Tu destino podría estar lleno. Elegiste no cambiar de estación: te avisaremos antes de llegar."
    elif alternatives:
        advice = alternatives[0]["text"]
    else:
        advice = "Tu destino podría estar lleno y no hay otra estación con lugar dentro de tu caminata máxima."

    return {"mode": data.mode, "data_ts": data_ts, "origin": origin_info, "destination": dest_info,
            "alternatives": alternatives[:3], "origin_alternatives": origin_alts,
            "advice": advice_origin + advice,
            "preferences": {"max_walk_min": max_walk_min, "accept_alternative": accept_alternative,
                            "avoid_effort": avoid_effort}}


def station_row(data: Data, sid: str) -> dict:
    st, s = data.stations[sid], data.states.get(sid)
    return {"station_id": sid, "name": st.name, "lat": st.lat, "lon": st.lon, "capacity": st.capacity,
            "useful_bikes_now": s.useful_bikes if s else None,
            "docks_available_now": s.docks_available if s else None,
            "is_renting": s.is_renting if s else False, "is_returning": s.is_returning if s else False,
            "data_ts": s.ts if s else None}


def station_rows(data: Data) -> list[dict]:
    return sorted((station_row(data, sid) for sid in data.stations), key=lambda r: r["name"])


def nearby(data: Data, lat: float, lon: float, now: datetime, limit: int = 5) -> list[dict]:
    """Lista para la pantalla de inicio (lista primero, mapa después)."""
    rows = []
    for sid, st in data.stations.items():
        walk = haversine_m(lat, lon, st.lat, st.lon) / WALK_M_PER_MIN
        s = data.states.get(sid)
        if not s:
            continue
        walk = max(1, round(walk))  # mismo minuto que se muestra y que usa recommend()
        p = simulate(data, sid, now, walk)["p_useful_bike"]
        rows.append({"station_id": sid, "name": st.name, "walk_min": round(walk, 1),
                     "useful_bikes_now": s.useful_bikes, "p_useful_bike": p,
                     "light": traffic_light(p), "data_ts": s.ts,
                     "text": f"{st.name} · {s.useful_bikes} bicis útiles · a {round(walk)} min · "
                             f"{_label_bike(p, walk)}"})
    return sorted(rows, key=lambda r: r["walk_min"])[:limit]
