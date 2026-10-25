"""
Línea 1 · Bici Útil: cuántas bicis sirven de verdad, reloj de 36 h e indicadores del contrato.

Funciona en dos modos:
- EJEMPLO (por defecto): fotos sintéticas del feed para 6 estaciones (semilla fija). No depende de nadie.
- REAL: con DATA_DIR=<ruta a data/> lee data/feed/*.parquet (historial MaxHalford, UTC).

Reglas (plan unificado, U2–U4):
- bici útil = bikes_available − sospechosas esperadas (C2). Las disponibles ya excluyen a las
  deshabilitadas, así que estas no se restan otra vez.
- Estación cerrada (no instalada o sin renta): no cuenta en ningún indicador y sus bicis
  deshabilitadas no son "deshabilitadas".
- Los indicadores de servicio excluyen 0:30–5:00 hora CDMX. De noche el feed marca casi todas las
  estaciones como cerradas: el reloj de 36 h ignora esas fotos (no lo reinician) y sigue corriendo.
- Reloj de 36 h: horas seguidas con al menos una bici deshabilitada en una estación abierta. El feed
  solo da conteos, así que no sabemos si es la misma bici: es la lectura por estación del contrato.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

CDMX = ZoneInfo("America/Mexico_City")
UTC = ZoneInfo("UTC")
HERE = Path(__file__).parent

CLOCK_LIMIT_H = 36          # bases de licitación 2026, págs. 165–181
MAX_EMPTY_PCT = 0.06        # máximo de tiempo con estación vacía según el contrato
MAX_GAP_H = 6.0             # hueco más largo que no rompe una racha (la noche fuera deja ~4.5 h)
NIGHT_FROM, NIGHT_TO = 30, 300   # minutos del día CDMX fuera de servicio (0:30–5:00)
PEAK_HOURS = (8, 18)
SNAP_MIN = 12               # el feed de MaxHalford se toma cada ~12 min
C2_TTL_S = 300              # cada cuánto se vuelve a pedir C2 a la Línea 2 (C2_URL)

# Nombres del feed (con o sin prefijo num_) -> nombre único
ALIASES = {
    "committed_at_utc": "ts", "committed_at": "ts", "timestamp": "ts", "ts": "ts",
    "num_bikes_available": "bikes_available", "bikes_available": "bikes_available",
    "num_bikes_disabled": "bikes_disabled", "bikes_disabled": "bikes_disabled",
    "num_docks_available": "docks_available", "docks_available": "docks_available",
    "num_docks_disabled": "docks_disabled", "docks_disabled": "docks_disabled",
    "is_installed": "is_installed", "is_renting": "is_renting", "is_returning": "is_returning",
    "station_id": "station_id",
}
COLS = ["station_id", "ts", "bikes_available", "bikes_disabled", "docks_available",
        "docks_disabled", "is_installed", "is_renting", "is_returning"]


# ---------------------------------------------------------------- datos
@dataclass
class Station:
    station_id: str
    name: str
    lat: float
    lon: float
    capacity: int
    short_name: str = ""     # código CE (p. ej. 271-272); el contrato usa station_id del GBFS


@dataclass
class Data:
    stations: dict[str, Station]
    snaps: pd.DataFrame                         # una fila por estación y foto, columnas COLS + derivadas
    suspected: dict[str, float] = field(default_factory=dict)   # C2, Línea 2
    mode: str = "EJEMPLO"
    c2_mode: str = "EJEMPLO"     # de dónde salieron las sospechosas: EJEMPLO, REAL o PENDIENTE
    c2_fetched_at: float = 0.0   # última vez que se pidió C2_URL (time.monotonic)


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Columnas del feed -> COLS, tipos limpios y columnas derivadas."""
    df = df.rename(columns={c: ALIASES[c] for c in df.columns if c in ALIASES})
    for c in ("docks_available", "docks_disabled"):
        if c not in df:
            df[c] = 0
    for c in ("is_installed", "is_renting", "is_returning"):
        df[c] = df[c].astype(bool) if c in df else True
    df = df[COLS].copy()
    df["station_id"] = df["station_id"].astype(str)
    df["ts"] = pd.to_datetime(df["ts"], utc=True)
    for c in ("bikes_available", "bikes_disabled", "docks_available", "docks_disabled"):
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).clip(lower=0).astype(int)
    df = df.drop_duplicates(["station_id", "ts"]).sort_values(["station_id", "ts"])
    local = df["ts"].dt.tz_convert(CDMX)
    df["hour"] = local.dt.hour
    mod = local.dt.hour * 60 + local.dt.minute
    df["in_service"] = ~((mod >= NIGHT_FROM) & (mod < NIGHT_TO))
    df["weekday"] = local.dt.day_of_week < 5
    df["is_open"] = df["is_installed"] & df["is_renting"]
    return df.reset_index(drop=True)


def _synthetic_snaps(stations: dict[str, Station], days: list[str], seed: int = 7) -> pd.DataFrame:
    """Fotos inventadas que reproducen los patrones de la investigación (EJEMPLO, no son datos)."""
    rng = np.random.default_rng(seed)
    rows = []
    # perfil por estación: (bicis base, cambio en pico de la mañana, deshabilitadas fijas)
    # 141/134 Buenavista se vacía, 267/295 Reforma se llena, 279 cierra, 136 tiene una dañada fija
    profile = {"141": (28, -28, 4), "134": (24, -22, 2), "267": (20, +16, 1),
               "295": (16, +10, 0), "279": (14, +6, 0), "136": (8, +4, 1)}
    for day in days:
        start = datetime.fromisoformat(day).replace(tzinfo=CDMX)
        for k in range(24 * 60 // SNAP_MIN):
            t = start + timedelta(minutes=k * SNAP_MIN)
            h = t.hour + t.minute / 60
            morning = np.exp(-((h - 8.5) / 1.2) ** 2)
            evening = np.exp(-((h - 18.5) / 1.5) ** 2)
            for sid, st in stations.items():
                base, delta, dis = profile.get(sid, (10, 0, 0))
                closed = sid == "279" and day == days[-1] and 10 <= h < 16   # cierre de 6 h
                bikes = base + delta * morning - 0.6 * delta * evening + rng.normal(0, 1)
                bikes = int(np.clip(round(bikes), 0, st.capacity - dis))
                # 136: una bici deshabilitada que nunca se retira (rebasa 36 h)
                # 134: deshabilitadas solo el último día
                d = dis if sid != "134" or day == days[-1] else 0
                if closed:
                    bikes, d = 0, st.capacity
                rows.append({
                    "station_id": sid, "ts": t.astimezone(UTC),
                    "bikes_available": bikes, "bikes_disabled": d,
                    "docks_available": max(st.capacity - bikes - d, 0), "docks_disabled": 0,
                    "is_installed": True, "is_renting": not closed, "is_returning": not closed})
    return pd.DataFrame(rows)


def load_fixtures() -> Data:
    f = HERE / "fixtures"
    st = {s["station_id"]: Station(**s) for s in json.loads((f / "stations.json").read_text())}
    days = ["2026-09-28", "2026-09-29", "2026-09-30"]   # lunes a miércoles
    snaps = normalize(_synthetic_snaps(st, days))
    return Data(st, snaps, load_suspected(st), "EJEMPLO", _c2_mode())


# ---------------------------------------------------------------- C2 · sospechosas (Línea 2)
def _c2_mode() -> str:
    if os.environ.get("C2_URL"):
        return "PENDIENTE"          # hasta que responda la Línea 2
    return "REAL" if os.environ.get("C2_FILE") else "EJEMPLO"


def station_key(x: object) -> str | None:
    """'CE-271-272', '271-272', '014' -> '271-272' / '14'. Misma regla que prepare_data.py."""
    if x is None:
        return None
    s = re.sub(r"\s+", "", str(x).strip().upper().replace("CE-", "").replace("CE", ""))
    s = re.sub(r"\.0$", "", s)
    return "-".join((p.lstrip("0") or "0") if p.isdigit() else p for p in s.split("-")) or None


def map_suspected(rows: list[dict], stations: dict[str, Station], ids: str = "gbfs") -> dict[str, float]:
    """Filas de C2 -> {station_id del GBFS: sospechosas}.

    `ids="gbfs"`: station_id ya es el del feed. `ids="ce"`: es el código CE de los viajes (p. ej. 271-272).
    No se adivina: "141" es CE-141 (Zacatecas) y también el ID del feed de Buenavista CE-271-272.
    """
    by_key = {station_key(st.short_name): sid for sid, st in stations.items() if st.short_name}
    out: dict[str, float] = {}
    for r in rows:
        raw = str(r.get("station_id", ""))
        sid = by_key.get(station_key(raw), "") if ids == "ce" else raw
        if sid in stations:
            out[sid] = out.get(sid, 0.0) + float(r.get("suspected_expected", 0) or 0)
    return out


def _c2_rows(payload: object) -> list[dict]:
    """C2 llega como lista o como {"mode", "items": [...]} (GET /api/v1/taller/priority)."""
    if isinstance(payload, dict):
        return list(payload.get("items") or payload.get("stations") or [])
    return list(payload or [])


def load_suspected(stations: dict[str, Station]) -> dict[str, float]:
    """Sospechosas desde archivo (C2_FILE o el ejemplo de fixtures/)."""
    path = Path(os.environ.get("C2_FILE", HERE / "fixtures" / "c2_priority.example.json"))
    if not path.exists():
        return {}
    ids = os.environ.get("C2_IDS", "ce" if os.environ.get("C2_FILE") else "gbfs")
    return map_suspected(_c2_rows(json.loads(path.read_text())), stations, ids)


def refresh_c2(data: Data, force: bool = False) -> None:
    """Con C2_URL, pide las sospechosas a la Línea 2 cada C2_TTL_S. Si falla, se queda con lo último."""
    url = os.environ.get("C2_URL")
    if not url or (not force and time.monotonic() - data.c2_fetched_at < C2_TTL_S):
        return
    data.c2_fetched_at = time.monotonic()
    try:
        with urllib.request.urlopen(url, timeout=3) as r:
            payload = json.load(r)
    except Exception:  # noqa: BLE001 - la Línea 2 caída no tumba a la Línea 1
        return
    # La Línea 2 hoy publica códigos CE (start_key de los viajes); C2_IDS=gbfs cuando cambie.
    data.suspected = map_suspected(_c2_rows(payload), data.stations, os.environ.get("C2_IDS", "ce"))
    data.c2_mode = str(payload.get("mode", "REAL")) if isinstance(payload, dict) else "REAL"


def stations_from_feed(raw: pd.DataFrame) -> dict[str, Station]:
    """Catálogo desde las columnas que ya trae el feed de MaxHalford (última foto de cada estación)."""
    last = raw.sort_values("committed_at_utc").groupby("station_id").tail(1)
    return {str(r.station_id): Station(str(r.station_id), str(r.name), float(r.latitude),
                                       float(r.longitude), int(r.capacity or 0), str(r.short_name or ""))
            for r in last.itertuples()}


def load_real(data_dir: str) -> Data:
    d = Path(data_dir).expanduser()
    files = sorted((d / "feed").glob("*.parquet"))
    if not files:
        raise FileNotFoundError(f"No hay feed en {d / 'feed'}")
    raw = pd.concat([pd.read_parquet(p) for p in files], ignore_index=True)
    st = stations_from_feed(raw)
    return Data(st, normalize(raw), {} if os.environ.get("C2_URL") else load_suspected(st), "REAL", _c2_mode())


def load() -> Data:
    if os.environ.get("DATA_DIR"):
        return load_real(os.environ["DATA_DIR"])
    return load_fixtures()


# ---------------------------------------------------------------- medidor (U2)
def useful(bikes_available: int, suspected: float) -> int:
    return int(max(0, round(bikes_available - suspected)))


def _with_useful(data: Data, df: pd.DataFrame) -> pd.DataFrame:
    sus = df["station_id"].map(data.suspected).fillna(0.0)
    df = df.assign(suspected_expected=sus)
    df["useful_bikes"] = np.where(
        df["is_open"], (df["bikes_available"] - sus).round().clip(lower=0), 0).astype(int)
    return df


def pct_empty_by_hour(data: Data) -> dict[tuple[str, int], float]:
    """(station_id, hora CDMX) -> fracción de fotos con bikes_available = 0 (días hábiles, abierta)."""
    s = data.snaps
    s = s[s["is_open"] & s["weekday"]]
    g = (s["bikes_available"] == 0).groupby([s["station_id"], s["hour"]]).mean()
    return {(sid, int(h)): float(v) for (sid, h), v in g.items()}


def snapshot_at(data: Data, at: datetime | None = None, service_only: bool = False) -> pd.DataFrame:
    """Última foto de cada estación con ts <= at (sin `at`, la más reciente)."""
    s = data.snaps[data.snaps["in_service"]] if service_only else data.snaps
    if at is not None:
        s = s[s["ts"] <= pd.Timestamp(at).tz_convert(UTC)]
    return s.groupby("station_id").tail(1)


def stations(data: Data, at: datetime | None = None) -> list[dict]:
    """Contrato C1: una fila por estación en la foto más cercana a `at`."""
    snap = _with_useful(data, snapshot_at(data, at))
    empty = pct_empty_by_hour(data)
    streaks = _current_streaks(data, at)
    out = []
    for r in snap.itertuples():
        st = data.stations.get(r.station_id)
        out.append({
            "station_id": r.station_id,
            "ts": r.ts.isoformat(),
            "bikes_available": int(r.bikes_available),
            "bikes_disabled": int(r.bikes_disabled) if r.is_open else 0,
            "useful_bikes": int(r.useful_bikes),
            "is_renting": bool(r.is_open),
            "pct_empty_hour": round(empty.get((r.station_id, int(r.hour)), 0.0), 3),
            "is_returning": bool(r.is_returning),
            "docks_available": int(r.docks_available),
            "docks_disabled": int(r.docks_disabled),
            "capacity": st.capacity if st else None,
            "suspected_expected": float(r.suspected_expected),
            "disabled_hours": round(streaks.get(r.station_id, 0.0), 1),
            "name": st.name if st else None,
            "short_name": st.short_name if st else None,
            "lat": st.lat if st else None,
            "lon": st.lon if st else None,
        })
    return sorted(out, key=lambda x: x["station_id"])


def hourly(data: Data, weekday_only: bool = True) -> list[dict]:
    """Perfil del sistema por hora CDMX: promedio por foto de bicis útiles y deshabilitadas."""
    s = _with_useful(data, data.snaps)
    s = s[s["is_open"] & (s["weekday"] | (not weekday_only))]
    per_snap = s.groupby(["ts", "hour"]).agg(
        bikes_available=("bikes_available", "sum"), bikes_disabled=("bikes_disabled", "sum"),
        useful_bikes=("useful_bikes", "sum"),
        stations_empty=("bikes_available", lambda x: (x == 0).mean()),
        stations_no_useful=("useful_bikes", lambda x: (x == 0).mean())).reset_index()
    out = []
    for h, g in per_snap.groupby("hour"):
        docked = g["bikes_available"] + g["bikes_disabled"]
        out.append({
            "hour": int(h),
            "in_service": not (NIGHT_FROM <= h * 60 < NIGHT_TO),
            "bikes_available": round(float(g["bikes_available"].mean()), 1),
            "bikes_disabled": round(float(g["bikes_disabled"].mean()), 1),
            "useful_bikes": round(float(g["useful_bikes"].mean()), 1),
            "pct_docked_unusable": round(float((g["bikes_disabled"] / docked.where(docked > 0)).mean()), 3),
            "pct_stations_empty": round(float(g["stations_empty"].mean()), 3),
            "pct_stations_no_useful": round(float(g["stations_no_useful"].mean()), 3),
            "snapshots": int(len(g)),
        })
    return out


# ---------------------------------------------------------------- reloj de 36 h (U3)
def _runs(data: Data) -> pd.DataFrame:
    """Rachas con al menos una bici deshabilitada en estación abierta: start, end, hours."""
    s = data.snaps.loc[data.snaps["in_service"], ["station_id", "ts", "bikes_disabled", "is_open"]].copy()
    s["flag"] = s["is_open"] & (s["bikes_disabled"] > 0)
    gap = s.groupby("station_id")["ts"].diff().dt.total_seconds().div(3600).fillna(np.inf)
    prev = s.groupby("station_id")["flag"].shift(fill_value=False)
    s["run"] = ((s["flag"] != prev) | (gap > MAX_GAP_H)).cumsum()
    r = s[s["flag"]].groupby(["station_id", "run"]).agg(
        start=("ts", "min"), end=("ts", "max"), max_disabled=("bikes_disabled", "max")).reset_index()
    r["hours"] = (r["end"] - r["start"]).dt.total_seconds() / 3600
    return r


def _current_streaks(data: Data, at: datetime | None) -> dict[str, float]:
    """Horas acumuladas de la racha vigente en la foto más cercana a `at`."""
    snap = snapshot_at(data, at, service_only=True)
    runs = _runs(data)
    out = {}
    for r in snap.itertuples():
        if not (r.is_open and r.bikes_disabled > 0):
            continue
        m = runs[(runs["station_id"] == r.station_id) & (runs["start"] <= r.ts) & (runs["end"] >= r.ts)]
        if len(m):
            out[r.station_id] = (r.ts - m["start"].iloc[0]).total_seconds() / 3600
    return out


def clock(data: Data, at: datetime | None = None, limit_h: float = CLOCK_LIMIT_H) -> dict:
    """Estaciones fuera de plazo ahora y episodios de más de `limit_h` en toda la ventana."""
    snap = snapshot_at(data, at, service_only=True).set_index("station_id")
    current = _current_streaks(data, at)
    over = sorted(
        ({"station_id": sid,
          "name": data.stations[sid].name if sid in data.stations else sid,
          "hours": round(h, 1),
          "bikes_disabled": int(snap.loc[sid, "bikes_disabled"]),
          "since": (snap.loc[sid, "ts"] - timedelta(hours=h)).isoformat()}
         for sid, h in current.items() if h > limit_h),
        key=lambda x: -x["hours"])
    runs = _runs(data)
    episodes = runs[runs["hours"] > limit_h]
    return {
        "ts": snap["ts"].max().isoformat() if len(snap) else None,
        "limit_h": limit_h,
        "stations_over_limit": len(over),
        "over_limit": over,
        "window": {
            "from": data.snaps["ts"].min().isoformat(),
            "to": data.snaps["ts"].max().isoformat(),
            "episodes_over_limit": int(len(episodes)),
            "stations_with_episode": int(episodes["station_id"].nunique()),
        },
    }


# ---------------------------------------------------------------- indicadores del contrato (U4)
def contract(data: Data, at: datetime | None = None) -> dict:
    """Los tres indicadores: bici útil 5:00 vs. pico, % vacía vs. 6% y estaciones fuera de 36 h."""
    prof = {p["hour"]: p for p in hourly(data)}
    at5 = prof.get(5, {}).get("useful_bikes")
    peak = {h: prof[h]["useful_bikes"] for h in PEAK_HOURS if h in prof}
    peak_min = min(peak.values()) if peak else None

    s = data.snaps
    s = s[s["is_open"] & s["in_service"]]
    s = _with_useful(data, s)
    pct_empty = float((s["bikes_available"] == 0).mean()) if len(s) else None
    pct_no_useful = float((s["useful_bikes"] == 0).mean()) if len(s) else None
    sp = s[s["hour"].isin(PEAK_HOURS) & s["weekday"]]
    pct_empty_peak = float((sp["bikes_available"] == 0).mean()) if len(sp) else None

    c = clock(data, at)
    return {
        "mode": data.mode,
        "c2_mode": data.c2_mode,
        "ts": c["ts"],
        "window": c["window"],
        "useful_peak_vs_5am": {
            "useful_at_5": at5,
            "useful_at_peak": peak,
            "ratio_peak_min_vs_5": round(peak_min / at5, 3) if at5 and peak_min is not None else None,
            "note": "Promedio por foto, días hábiles, estaciones abiertas. El indicador oficial se mide a las 5:00.",
        },
        "pct_time_empty": {
            "value": round(pct_empty, 4) if pct_empty is not None else None,
            "value_no_useful": round(pct_no_useful, 4) if pct_no_useful is not None else None,
            "value_peak": round(pct_empty_peak, 4) if pct_empty_peak is not None else None,
            "limit": MAX_EMPTY_PCT,
            "meets": pct_empty is not None and pct_empty <= MAX_EMPTY_PCT,
            "note": "Fotos de estaciones abiertas, 5:00–0:30 CDMX.",
        },
        "stations_over_36h": {
            "value": c["stations_over_limit"],
            "episodes_in_window": c["window"]["episodes_over_limit"],
            "stations_with_episode": c["window"]["stations_with_episode"],
            "limit_h": CLOCK_LIMIT_H,
        },
    }
