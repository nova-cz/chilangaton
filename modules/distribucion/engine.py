"""S3 · Simulador del corredor (Python puro en el nucleo: sin pandas). Ejecutar: python -m modules.distribucion.engine

Reproduce un dia real (martes 29 sep 2026, 7:00-10:00 CDMX): cada salida resta una bici de su estacion y
cada llegada la suma. Salida sin bicis = viaje perdido; llegada sin anclajes = desvio a la estacion cercana con anclaje.
Escenario de adopcion p: fraccion p de los viajes de contraflujo (zona que se llena -> zona que se vacia) termina en la
estacion VACIA mas cercana a su destino (<= 500 m). Todo es SIMULADO: no predice, solo compara escenarios.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from .zones import EMPTYING, FILLING, haversine_m

FIXTURES = Path(__file__).parent / "fixtures"
SEED = 42
DAY = datetime(2026, 9, 29)
START = DAY.replace(hour=7)
END = DAY.replace(hour=10)
STEP_MIN = 15
ADOPTIONS = (0, 5, 10, 20)
RADIUS_M = 500.0
CDMX_UTC_OFFSET = timedelta(hours=6)  # CDMX es UTC-6 todo el ano desde 2022
TARGET_ZONES = ("Buenavista", "San Rafael")


@dataclass(frozen=True)
class Station:
    code: str
    lat: float
    lon: float
    capacity: int
    bikes: int  # bicis disponibles en el inventario inicial
    disabled: int  # bicis deshabilitadas que ocupan anclaje
    zone: str | None = None


@dataclass(frozen=True)
class Trip:
    origin: str
    dest: str
    t_out: datetime  # hora local CDMX (naive)
    t_in: datetime


def build_neighbors(stations: list[Station], radius_m: float = RADIUS_M) -> list[list[tuple[float, int]]]:
    """Por estacion, vecinos dentro de `radius_m` ordenados por distancia (incluye a si misma con 0 m)."""
    out: list[list[tuple[float, int]]] = []
    for a in stations:
        near = []
        for j, b in enumerate(stations):
            if abs(a.lat - b.lat) > 0.0075 or abs(a.lon - b.lon) > 0.0075:  # recorte rapido (~800 m)
                continue
            d = haversine_m(a.lat, a.lon, b.lat, b.lon)
            if d <= radius_m:
                near.append((d, j))
        near.sort()
        out.append(near)
    return out


def _iso_utc(local: datetime) -> str:
    return (local + CDMX_UTC_OFFSET).strftime("%Y-%m-%dT%H:%M:%SZ")


def simulate(
    stations: list[Station],
    trips: list[Trip],
    *,
    adoption: float,
    recovered: bool,
    seed: int = SEED,
    start: datetime = START,
    end: datetime = END,
    step_min: int = STEP_MIN,
    neighbors: list[list[tuple[float, int]]] | None = None,
    return_final: bool = False,
) -> dict:
    """Corre un escenario. `adoption` es una fraccion 0-1. Misma semilla y entradas = mismo resultado."""
    idx = {s.code: i for i, s in enumerate(stations)}
    cap = [s.capacity for s in stations]
    bikes = [max(0, min(s.bikes, s.capacity)) for s in stations]
    disabled = [0 if recovered else max(0, min(s.disabled, s.capacity - bikes[i])) for i, s in enumerate(stations)]
    if recovered:  # las bicis deshabilitadas vuelven a servicio a las 7:00
        bikes = [min(cap[i], bikes[i] + s.disabled) for i, s in enumerate(stations)]
    nb = neighbors if neighbors is not None else build_neighbors(stations)
    in_target = [s.zone in TARGET_ZONES for s in stations]

    # Viajes validos en la ventana y seleccion (con semilla) de los que adoptan.
    valid = [t for t in trips if t.origin in idx and t.dest in idx and (start <= t.t_out < end or start <= t.t_in < end)]
    valid.sort(key=lambda t: (t.t_out, t.t_in, t.origin, t.dest))
    contra = [
        k
        for k, t in enumerate(valid)
        if stations[idx[t.origin]].zone in FILLING and stations[idx[t.dest]].zone in EMPTYING
    ]
    chosen = set(random.Random(seed).sample(contra, round(len(contra) * adoption))) if contra and adoption > 0 else set()

    events: list[tuple[datetime, int, int]] = []  # (hora, 0=llegada | 1=salida, indice de viaje)
    for k, t in enumerate(valid):
        if start <= t.t_out < end:
            events.append((t.t_out, 1, k))
        if t.t_in < end and t.t_in >= start:
            events.append((t.t_in, 0, k))
    events.sort()

    served = [t.t_out < start for t in valid]  # en transito antes de las 7:00: sale ya descontado del inventario
    counts = {"empty": 0, "full": 0, "empty_t": 0, "full_t": 0}
    acc = {"empty": 0.0, "full": 0.0, "empty_t": 0.0, "full_t": 0.0}

    def flags(i: int) -> tuple[bool, bool]:
        return bikes[i] == 0, bikes[i] + disabled[i] >= cap[i]

    for i in range(len(stations)):
        e, f = flags(i)
        counts["empty"] += e
        counts["full"] += f
        if in_target[i]:
            counts["empty_t"] += e
            counts["full_t"] += f

    clock = start

    def advance(to: datetime) -> None:
        nonlocal clock
        hours = (to - clock).total_seconds() / 3600
        for key in acc:
            acc[key] += counts[key] * hours
        clock = to

    def change(i: int, delta: int) -> None:
        e0, f0 = flags(i)
        bikes[i] += delta
        e1, f1 = flags(i)
        for key, a, b in (("empty", e0, e1), ("full", f0, f1)):
            counts[key] += int(b) - int(a)
            if in_target[i]:
                counts[key + "_t"] += int(b) - int(a)

    lost = diverted = unplaced = moved = 0
    series = []
    steps = [start + timedelta(minutes=step_min * n) for n in range(int((end - start).total_seconds() // 60 // step_min) + 1)]
    step_i = 0

    def sample(upto: datetime) -> None:
        nonlocal step_i
        while step_i < len(steps) and steps[step_i] <= upto:
            advance(steps[step_i])
            series.append(
                {
                    "ts": _iso_utc(steps[step_i]),
                    "empty_stations": counts["empty"],
                    "full_stations": counts["full"],
                    "empty_stations_target": counts["empty_t"],
                    "full_stations_target": counts["full_t"],
                }
            )
            step_i += 1

    for when, kind, k in events:
        sample(when - timedelta(microseconds=1))
        advance(when)
        trip = valid[k]
        if kind == 1:
            o = idx[trip.origin]
            if bikes[o] > 0:
                change(o, -1)
                served[k] = True
            else:
                lost += 1
        elif served[k]:
            d = idx[trip.dest]
            if k in chosen:
                target = next((j for _, j in nb[d] if bikes[j] == 0 and bikes[j] + disabled[j] < cap[j]), None)
                if target is not None:
                    if target != d:
                        moved += 1
                    d = target
            if bikes[d] + disabled[d] >= cap[d]:  # sin anclajes: desvio
                diverted += 1
                alt = next((j for _, j in nb[d] if bikes[j] + disabled[j] < cap[j]), None)
                if alt is None:
                    unplaced += 1
                    continue
                d = alt
            change(d, +1)
    sample(end)
    advance(end)

    result = {
        "adoption_pct": round(adoption * 100),
        "contraflow_trips": len(contra),
        "adopting_trips": len(chosen),
        "totals": {
            "empty_station_hours": round(acc["empty"], 1),
            "full_station_hours": round(acc["full"], 1),
            "empty_station_hours_target": round(acc["empty_t"], 2),
            "full_station_hours_target": round(acc["full_t"], 2),
            "lost_trips": lost,
            "diverted_arrivals": diverted,
            "bikes_moved": moved,
        },
        "series": series,
    }
    if return_final:
        result["final_inventory"] = {s.code: (bikes[i], disabled[i], cap[i]) for i, s in enumerate(stations)}
    return result


def run_all() -> dict:
    """Carga los datos locales, corre 0/5/10/20 % x recovered y escribe fixtures/simulation_results.json."""
    from .data import load_feed, load_stations, load_trips
    from .zones import zone_of

    info = load_stations()
    feed = load_feed()
    target_utc = (START + CDMX_UTC_OFFSET).replace(tzinfo=None)
    snaps = feed.ts_utc.dt.tz_convert("UTC").dt.tz_localize(None).drop_duplicates()
    snap = snaps.iloc[(snaps - target_utc).abs().argmin()]
    inv = feed[feed.ts_utc.dt.tz_convert("UTC").dt.tz_localize(None) == snap].drop_duplicates("code").set_index("code")

    stations = [
        Station(code, float(info.latitude[code]), float(info.longitude[code]), int(r.capacity), int(r.bikes), int(r.disabled), zone_of(float(info.latitude[code]), float(info.longitude[code])))
        for code, r in inv.iterrows()
        if code in info.index and r.capacity > 0
    ]
    df = load_trips()
    df = df[((df.t_out >= START) & (df.t_out < END)) | ((df.t_in >= START) & (df.t_in < END))]
    trips = [Trip(r.origin, r.dest, r.t_out.to_pydatetime(), r.t_in.to_pydatetime()) for r in df.itertuples()]
    nb = build_neighbors(stations)

    scenarios: dict[str, dict[str, dict]] = {}
    for recovered in (False, True):
        scenarios[str(recovered).lower()] = {
            str(p): simulate(stations, trips, adoption=p / 100, recovered=recovered, neighbors=nb) for p in ADOPTIONS
        }
    out = {
        "label": "SIMULADO",
        "seed": SEED,
        "date": DAY.date().isoformat(),
        "window": {"start": "07:00", "end": "10:00", "tz": "America/Mexico_City", "step_minutes": STEP_MIN},
        "inventory_snapshot_utc": snap.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stations": len(stations),
        "trips_in_window": len(trips),
        "target_zones": list(TARGET_ZONES),
        "assumptions": [
            "Día reproducido: martes 29 de septiembre de 2026, 7:00 a 10:00 hora CDMX, pasos de 15 minutos.",
            "Inventario inicial: snapshot del feed más cercano a las 7:00; los viajes reales se reproducen tal cual.",
            "Salida sin bicis = viaje perdido. Llegada sin anclajes = desvío a la estación más cercana con anclaje (≤ 500 m).",
            "Adopción p %: fracción de los viajes de contraflujo (Anzures/Polanco/Reforma a Buenavista/San Rafael) que termina en la estación vacía más cercana a su destino (≤ 500 m); si no hay, termina donde iba.",
            "Bicis recuperadas antes: las bicis deshabilitadas del feed vuelven a servicio a las 7:00.",
            f"Semilla fija ({SEED}); zonas aproximadas con círculos (zones.py). Resultado simulado, no es un pronóstico.",
        ],
        "scenarios": scenarios,
    }
    FIXTURES.mkdir(exist_ok=True)
    (FIXTURES / "simulation_results.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    return out


if __name__ == "__main__":
    res = run_all()
    for rec, group in res["scenarios"].items():
        print(f"recovered={rec}")
        for p, r in group.items():
            print(f"  {p:>2}%  {r['totals']}  contraflujo={r['contraflow_trips']} adoptan={r['adopting_trips']}")
