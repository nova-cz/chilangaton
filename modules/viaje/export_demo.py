"""Exporta un escenario fijo del motor para la web en modo DEMO (sin API).

    python -m modules.viaje.export_demo

Escenario: martes 29 sep 2026, 07:45 CDMX, con los fixtures de EJEMPLO.
Escribe apps/web/src/features/viaje/demo-snapshot.json. Todo es inventado → la web lo marca con DemoBadge.
"""

import json
from datetime import datetime
from pathlib import Path

from . import engine

AT = datetime(2026, 9, 29, 7, 45, tzinfo=engine.CDMX)
HORIZONS = (15, 30, 45, 60, 75, 90)
WALKS = (2, 3, 5, 10)
HOME = (19.4472, -99.1519)  # Buenavista: la historia de Isabel
OUT = Path(__file__).resolve().parents[2] / "apps/web/src/features/viaje/demo-snapshot.json"


def main():
    d = engine.load_fixtures()
    ids = sorted(d.stations)
    recs = {}
    for o in ids:
        for t in ids:
            if o == t:
                continue
            for w in WALKS:
                r = engine.recommend(d, o, t, AT, max_walk_min=w)
                r.pop("preferences")
                recs[f"{o}>{t}>{w}"] = r
    snap = {
        "_meta": {"label": "DEMO", "at_local": AT.strftime("%Y-%m-%dT%H:%M"),
                  "note": "Escenario de EJEMPLO del motor de Línea 3. No son datos de ECOBICI."},
        "mode": d.mode,
        "home": {"lat": HOME[0], "lon": HOME[1], "label": "Buenavista"},
        "stations": engine.station_rows(d),
        "nearby": engine.nearby(d, *HOME, AT, limit=6),
        "forecast": {sid: engine.forecast(d, sid, AT, HORIZONS) for sid in ids},
        "recommendations": recs,
    }
    OUT.write_text(json.dumps(snap, ensure_ascii=False, separators=(",", ":")))
    print(f"✔ {OUT} · {OUT.stat().st_size // 1024} KB · {len(recs)} recomendaciones")


if __name__ == "__main__":
    main()
