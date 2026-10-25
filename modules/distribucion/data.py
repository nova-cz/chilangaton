"""Carga de datos locales (data/, no se sube) para S2/S3. Solo uso offline: la API no importa este modulo.

Privacidad: de los viajes solo se leen estacion y hora; edad y genero nunca salen de la consulta.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

import duckdb
import pandas as pd

DATA_DIR = Path(os.environ.get("EQUILIBICI_DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
TRIPS_CSV = "public_data_web_2026-09.csv"
FEED_PARQUET = "Sep.parquet"
STATIONS_JSON = "station_information.json"


def normalize_code(code: object) -> str:
    """'CE-028' / '028' / 28 -> '28' (quita prefijo CE- y ceros a la izquierda)."""
    text = str(code).strip().upper().removeprefix("CE-").strip()
    return text.lstrip("0") or "0"


def load_stations(data_dir: Path = DATA_DIR) -> pd.DataFrame:
    """short_name normalizado -> nombre, lat, lon, capacity."""
    raw = json.loads((data_dir / STATIONS_JSON).read_text())["data"]["stations"]
    df = pd.DataFrame(raw)[["short_name", "name", "lat", "lon", "capacity"]].rename(columns={"lat": "latitude", "lon": "longitude"})
    df["code"] = df["short_name"].map(normalize_code)
    return df.drop_duplicates("code").set_index("code")[["name", "latitude", "longitude", "capacity"]]


def load_trips(data_dir: Path = DATA_DIR) -> pd.DataFrame:
    """Viajes con origen/destino normalizados y fecha/hora local CDMX de retiro y arribo (sin edad ni genero)."""
    con = duckdb.connect()
    df = con.execute(
        f"""
        SELECT Ciclo_Estacion_Retiro AS origin_raw, Ciclo_EstacionArribo AS dest_raw,
               Fecha_Retiro + Hora_Retiro AS t_out, Fecha_Arribo + Hora_Arribo AS t_in
        FROM read_csv('{(data_dir / TRIPS_CSV).as_posix()}')
        """
    ).df()
    df["origin"] = df.pop("origin_raw").map(normalize_code)
    df["dest"] = df.pop("dest_raw").map(normalize_code)
    return df


def load_feed(data_dir: Path = DATA_DIR, *, at_utc: datetime | None = None) -> pd.DataFrame:
    """GBFS con estado operativo. `at_utc` limita la carga al snapshot más cercano en DuckDB."""
    con = duckdb.connect()
    con.execute("SET TimeZone='UTC'")
    path = (data_dir / FEED_PARQUET).as_posix()
    where = ""
    params: list[object] = [path]
    if at_utc is not None:
        where = """WHERE committed_at_utc = (
            SELECT committed_at_utc FROM read_parquet(?)
            ORDER BY abs(epoch(committed_at_utc) - epoch(CAST(? AS TIMESTAMP)))
            LIMIT 1
        )"""
        params.extend([path, at_utc])
    df = con.execute(
        f"""
        SELECT short_name, committed_at_utc AS ts_utc, capacity, num_bikes_available AS bikes,
               num_bikes_disabled AS disabled, num_docks_available AS docks,
               coalesce(is_installed, false) AS is_installed,
               coalesce(is_renting, false) AS is_renting,
               coalesce(is_returning, false) AS is_returning
        FROM read_parquet(?) {where}
        """, params
    ).df()
    con.close()
    df["code"] = df.pop("short_name").map(normalize_code)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)
    df["ts_local"] = (df["ts_utc"] - pd.Timedelta(hours=6)).dt.tz_localize(None)
    return df
