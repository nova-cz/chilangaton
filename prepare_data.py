"""
Equilibici · prepara TODOS los datos compartidos en una sola corrida.

Uso (desde la raíz del repo, en la rama data o en tu máquina):
    pip install duckdb pandas pyarrow requests
    python prepare_data.py

Deja esto en ./data/ :
    data/trips/trips_2026-07.parquet ... trips_2026-09.parquet   (viajes, columnas iguales, hora CDMX)
    data/feed/feed_2026-08.parquet, feed_2026-09.parquet          (historial del feed, UTC)
    data/stations.parquet                                          (catálogo + equivalencia CSV <-> station_id)
    data/demo/feed_demo_day.parquet                                (feed del martes demo 7-10 h)
    data/demo/trips_demo_day.parquet                               (viajes del martes demo 7-10 h)
    data/MANIFEST.md                                               (qué hay, filas, fechas, avisos)
"""

import io
import re
import sys
import unicodedata
from pathlib import Path

import duckdb
import pandas as pd
import requests

OUT = Path("data")
DEMO_DAY = "2026-09-29"          # martes demo (cambiar si hay huecos en el feed)
DEMO_FROM, DEMO_TO = "07:00", "10:00"

TRIPS = {  # URLs de https://ecobici.cdmx.gob.mx/datos-abiertos/
    "2026-07": "https://ecobici.cdmx.gob.mx/wp-content/uploads/2026/08/public_data_web_2026-07.csv",
    "2026-08": "https://ecobici.cdmx.gob.mx/wp-content/uploads/2026/09/public_data_web_2026-08_2.csv",
    "2026-09": "https://ecobici.cdmx.gob.mx/wp-content/uploads/2026/10/public_data_web_2026-09.csv",
}
FEED = {  # Parquet mensual de MaxHalford/bike-sharing-history
    "2026-08": "https://storage.googleapis.com/bike-sharing-history/mexico-city/ecobici/2026/Aug.parquet",
    "2026-09": "https://storage.googleapis.com/bike-sharing-history/mexico-city/ecobici/2026/Sep.parquet",
}
GBFS_INFO = "https://gbfs.mex.lyftbikes.com/gbfs/en/station_information.json"

log = []
def say(msg):
    print(msg); log.append(msg)

def norm(col):
    col = unicodedata.normalize("NFKD", col).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", col.strip().lower()).strip("_")

# Nombres de columna que han cambiado entre años -> nombre único
ALIASES = {
    "genero_usuario": "gender", "edad_usuario": "age", "bici": "bike_id",
    "ciclo_estacion_retiro": "start_station", "ciclo_estacionretiro": "start_station",
    "fecha_retiro": "start_date", "hora_retiro": "start_time",
    "ciclo_estacion_arribo": "end_station", "ciclo_estacionarribo": "end_station",
    "fecha_arribo": "end_date", "hora_arribo": "end_time",
}

def station_key(x):
    """'CE-271-272', '271-272', ' 271 ' -> '271-272' / '271' (para unir CSV con el feed)."""
    if pd.isna(x):
        return None
    s = str(x).strip().upper().replace("CE-", "").replace("CE", "")
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"\.0$", "", s)
    s = "-".join(p.lstrip("0") or "0" if p.isdigit() else p for p in s.split("-"))  # '014' -> '14'
    return s or None

def fetch(url):
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    return r.content

# ---------- 1. Viajes ----------
def prepare_trips():
    (OUT / "trips").mkdir(parents=True, exist_ok=True)
    for month, url in TRIPS.items():
        say(f"Viajes {month}: descargando…")
        raw = fetch(url)
        df = pd.read_csv(io.BytesIO(raw), dtype=str, encoding_errors="replace")
        df.columns = [ALIASES.get(norm(c), norm(c)) for c in df.columns]
        missing = {"bike_id", "start_station", "start_date", "start_time",
                   "end_station", "end_date", "end_time"} - set(df.columns)
        if missing:
            say(f"  ⚠ faltan columnas {missing}. Columnas encontradas: {list(df.columns)}")
            continue
        for p in ("start", "end"):
            local = pd.to_datetime(df[f"{p}_date"] + " " + df[f"{p}_time"],
                                   dayfirst=True, errors="coerce")
            df[f"{p}_local"] = local                                   # hora CDMX
            df[f"{p}_utc"] = local.dt.tz_localize("America/Mexico_City",
                                                  ambiguous="NaT", nonexistent="NaT").dt.tz_convert("UTC")
            df[f"{p}_key"] = df[f"{p}_station"].map(station_key)
        bad = df["start_local"].isna().sum() + df["end_local"].isna().sum()
        df["duration_min"] = (df["end_local"] - df["start_local"]).dt.total_seconds() / 60
        keep = ["bike_id", "start_station", "start_key", "start_local", "start_utc",
                "end_station", "end_key", "end_local", "end_utc", "duration_min"]
        df = df[keep]
        out = OUT / "trips" / f"trips_{month}.parquet"
        df.to_parquet(out, index=False)
        say(f"  ✔ {out} · {len(df):,} viajes · fechas no leídas: {bad:,}")

# ---------- 2. Historial del feed ----------
def prepare_feed():
    (OUT / "feed").mkdir(parents=True, exist_ok=True)
    for month, url in FEED.items():
        say(f"Feed {month}: descargando…")
        out = OUT / "feed" / f"feed_{month}.parquet"
        out.write_bytes(fetch(url))
        con = duckdb.connect()
        n, mn, mx, st = con.execute(f"""
            SELECT count(*), min(committed_at_utc), max(committed_at_utc), count(DISTINCT station_id)
            FROM read_parquet('{out}')""").fetchone()
        say(f"  ✔ {out} · {n:,} filas · {st} estaciones · {mn} → {mx} (UTC)")

# ---------- 3. Catálogo de estaciones + equivalencia ----------
def prepare_stations():
    say("Catálogo de estaciones (GBFS)…")
    info = requests.get(GBFS_INFO, timeout=60).json()["data"]["stations"]
    st = pd.DataFrame(info)
    cols = [c for c in ["station_id", "short_name", "name", "lat", "lon", "capacity"] if c in st]
    st = st[cols].copy()
    st["key"] = st.get("short_name", st["name"]).map(station_key)
    # Valida contra los códigos de los viajes
    trips = duckdb.connect().execute(
        f"SELECT DISTINCT start_key AS key FROM read_parquet('{OUT}/trips/*.parquet')").df()
    matched = trips["key"].isin(st["key"]).mean() * 100 if len(trips) else 0
    st.to_parquet(OUT / "stations.parquet", index=False)
    say(f"  ✔ data/stations.parquet · {len(st)} estaciones · {matched:.1f}% de códigos del CSV encontrados")
    if matched < 95:
        sample = trips.loc[~trips["key"].isin(st["key"]), "key"].head(10).tolist()
        say(f"  ⚠ Revisar equivalencia con Jass. Códigos sin pareja (ejemplo): {sample}")

# ---------- 4. Día demo ----------
def prepare_demo():
    (OUT / "demo").mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    con.execute("SET TimeZone='America/Mexico_City'")
    month = DEMO_DAY[:7]
    con.execute(f"""
        COPY (SELECT * FROM read_parquet('{OUT}/feed/feed_{month}.parquet')
              WHERE CAST(committed_at_utc AS TIMESTAMPTZ)::DATE = DATE '{DEMO_DAY}'
                AND strftime(CAST(committed_at_utc AS TIMESTAMPTZ), '%H:%M') BETWEEN '{DEMO_FROM}' AND '{DEMO_TO}')
        TO '{OUT}/demo/feed_demo_day.parquet' (FORMAT PARQUET)""")
    con.execute(f"""
        COPY (SELECT * FROM read_parquet('{OUT}/trips/trips_{month}.parquet')
              WHERE CAST(start_local AS DATE) = DATE '{DEMO_DAY}'
                AND strftime(start_local, '%H:%M') BETWEEN '{DEMO_FROM}' AND '{DEMO_TO}')
        TO '{OUT}/demo/trips_demo_day.parquet' (FORMAT PARQUET)""")
    f = con.execute(f"SELECT count(*), count(DISTINCT committed_at_utc) FROM read_parquet('{OUT}/demo/feed_demo_day.parquet')").fetchone()
    t = con.execute(f"SELECT count(*) FROM read_parquet('{OUT}/demo/trips_demo_day.parquet')").fetchone()[0]
    say(f"Día demo {DEMO_DAY} {DEMO_FROM}-{DEMO_TO}: {f[0]:,} filas del feed en {f[1]} fotos · {t:,} viajes")
    if f[1] < 12:
        say("  ⚠ Pocas fotos del feed ese día (esperado ~15). Prueba otro martes (8 o 22 de sep).")

if __name__ == "__main__":
    steps = sys.argv[1:] or ["trips", "feed", "stations", "demo"]
    for s in steps:
        try:
            {"trips": prepare_trips, "feed": prepare_feed,
             "stations": prepare_stations, "demo": prepare_demo}[s]()
        except Exception as e:  # sigue con lo demás y lo deja anotado
            say(f"✖ Paso '{s}' falló: {e}")
    (OUT / "MANIFEST.md").write_text("# Datos de Equilibici\n\n" + "\n".join(f"- {l}" for l in log) +
        "\n\nReglas: todo se guarda en UTC y se muestra en hora CDMX; "
        "las columnas *_local de viajes ya están en hora CDMX.\n", encoding="utf-8")
    print("\nListo. Revisa data/MANIFEST.md")
