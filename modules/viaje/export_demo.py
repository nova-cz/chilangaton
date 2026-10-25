"""Exporta un escenario fijo del motor para la web en modo DEMO (sin API).

    python -m modules.viaje.export_demo

Escenario: martes 29 sep 2026, 07:45 CDMX (la historia de Isabel: Buenavista → Reforma).
Usa engine.load(): REAL si existe modules/viaje/real/, si no los fixtures de EJEMPLO (la web
muestra DemoBadge). Con datos reales solo exporta el corredor: orígenes cerca de Buenavista y
destinos cerca de Reforma, para que el JSON quede chico.
"""

import json
from datetime import datetime
from pathlib import Path

from . import engine

AT = datetime(2026, 9, 29, 7, 45, tzinfo=engine.CDMX)
HORIZONS = (15, 30, 45, 60, 75, 90)
WALKS = (2, 3, 5, 10)
HOME = (19.4472, -99.1519)    # Buenavista
WORK = (19.4290, -99.1640)    # Reforma - Río de Plata
N_ORIGINS, N_DESTINATIONS = 6, 10
OUT = Path(__file__).resolve().parents[2] / "apps/web/src/features/viaje/demo-snapshot.json"


def main():
    d = engine.load()

    def closest(pt, n):
        return sorted(d.stations, key=lambda s: engine.haversine_m(*pt, d.stations[s].lat, d.stations[s].lon))[:n]

    if len(d.stations) <= 12:
        origins = destinations = sorted(d.stations)
    else:
        origins, destinations = closest(HOME, N_ORIGINS), closest(WORK, N_DESTINATIONS)
    recs = {}
    for o in origins:
        for t in destinations:
            if o == t:
                continue
            for w in WALKS:
                r = engine.recommend(d, o, t, AT, max_walk_min=w)
                r.pop("preferences")
                recs[f"{o}>{t}>{w}"] = r
    ids = sorted(set(origins) | set(destinations) | {a["station_id"] for r in recs.values() for a in r["alternatives"]})
    snap = {
        "_meta": {"label": "DEMO", "at_local": AT.strftime("%Y-%m-%dT%H:%M"),
                  "note": "Escenario de EJEMPLO del motor de Línea 3. No son datos de ECOBICI."},
        "mode": d.mode,
        "home": {"lat": HOME[0], "lon": HOME[1], "label": "Buenavista"},
        "stations": [engine.station_row(d, s) for s in ids],
        "origins": origins,
        "destinations": destinations,
        "nearby": engine.nearby(d, *HOME, AT, limit=6),
        "forecast": {sid: engine.forecast(d, sid, AT, HORIZONS) for sid in ids},
        "recommendations": recs,
    }
    OUT.write_text(json.dumps(snap, ensure_ascii=False, separators=(",", ":")))
    print(f"✔ {OUT} · {OUT.stat().st_size // 1024} KB · {len(recs)} recomendaciones")


if __name__ == "__main__":
    main()
