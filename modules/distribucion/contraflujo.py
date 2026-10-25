"""S2 · Analisis de contraflujo. Ejecutar desde la raiz: python -m modules.distribucion.contraflujo

Viajes de dias habiles de septiembre 2026, 7:00-10:00 (hora CDMX), que salen de zonas que se llenan
(Anzures, Polanco, Reforma) y llegan a zonas que se vacian (Buenavista, San Rafael).
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from . import zones
from .data import load_stations, load_trips

FIXTURES = Path(__file__).parent / "fixtures"
START_H, END_H = 7, 10
MONTH = (date(2026, 9, 1), date(2026, 9, 30))
# Criterio de viabilidad (ajustable): con 10 % de adopcion, al menos 10 bicis redistribuidas por dia habil.
ADOPTION_REF = 0.10
MIN_BIKES_PER_DAY = 10
THRESHOLD_TRIPS_PER_DAY = MIN_BIKES_PER_DAY / ADOPTION_REF


def run() -> dict:
    stations = load_stations()
    print("Estaciones por zona (aproximacion en zones.py):")
    zone_counts = zones.print_zone_counts(stations)
    zone_of = zones.assign_zones(stations)

    trips = load_trips()
    trips = trips[(trips.t_out.dt.date >= MONTH[0]) & (trips.t_out.dt.date <= MONTH[1])]
    weekday = trips.t_out.dt.dayofweek < 5
    hour = trips.t_out.dt.hour
    window = trips[weekday & (hour >= START_H) & (hour < END_H)].copy()
    window["zo"] = window.origin.map(zone_of)
    window["zd"] = window.dest.map(zone_of)
    window["day"] = window.t_out.dt.date

    days = sorted({d for d in trips[weekday].t_out.dt.date})
    contra = window[window.zo.isin(zones.FILLING) & window.zd.isin(zones.EMPTYING)]
    per_day = contra.groupby("day").size().reindex(days, fill_value=0)
    avg = float(per_day.mean())

    by_zone = (
        contra.groupby(["zo", "zd"]).size().div(len(days)).round(1).reset_index(name="trips_per_day").sort_values("trips_per_day", ascending=False)
    )
    pairs = contra.groupby(["origin", "dest"]).size().div(len(days)).round(2).sort_values(ascending=False).head(10)
    top_pairs = [
        {
            "origin": {"code": o, "name": stations.name.get(o, o)},
            "dest": {"code": d, "name": stations.name.get(d, d)},
            "trips_per_day": float(v),
        }
        for (o, d), v in pairs.items()
    ]

    viable = avg >= THRESHOLD_TRIPS_PER_DAY
    result = {
        "label": "DATOS REALES (septiembre 2026), zonas aproximadas",
        "window": {"weekdays_only": True, "start": f"{START_H:02d}:00", "end": f"{END_H:02d}:00", "tz": "America/Mexico_City", "days": len(days)},
        "zones": {z.name: {"role": z.role, "radius_m": z.radius_m, "stations": zone_counts[z.name], "center": [z.lon, z.lat]} for z in zones.ZONES},
        "trips_per_day_avg": round(avg, 1),
        "trips_per_day_min": int(per_day.min()),
        "trips_per_day_max": int(per_day.max()),
        "by_zone_pair": [{"from": r.zo, "to": r.zd, "trips_per_day": r.trips_per_day} for r in by_zone.itertuples()],
        "top_station_pairs": top_pairs,
        "criterion": f"viable si el promedio de contraflujo ≥ {THRESHOLD_TRIPS_PER_DAY:.0f} viajes por día hábil (con {ADOPTION_REF:.0%} de adopción = {MIN_BIKES_PER_DAY} bicis por día)",
        "viable": bool(viable),
        "conclusion": (
            f"{'VIABLE' if viable else 'NO VIABLE'}: {avg:.0f} viajes de contraflujo por día hábil "
            f"(umbral {THRESHOLD_TRIPS_PER_DAY:.0f}); a {ADOPTION_REF:.0%} de adopción serían ~{avg * ADOPTION_REF:.0f} bicis por día."
        ),
    }
    FIXTURES.mkdir(exist_ok=True)
    (FIXTURES / "contraflujo.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(result["conclusion"])
    return result


if __name__ == "__main__":
    run()
