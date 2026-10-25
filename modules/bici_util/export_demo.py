"""Exporta una foto fija del motor para la web en modo DEMO (sin API).

    DATA_DIR=data python -m modules.bici_util.export_demo

Foto: martes 29 sep 2026, 08:00 CDMX, con el historial REAL del feed (ago–sep 2026).
Sin el archivo real de C2 no se descuentan sospechosas: `c2_mode` queda "PENDIENTE" y la web lo dice.
Escribe apps/web/src/features/bici-util/demo-snapshot.json.
"""

import json
import os
from datetime import datetime
from pathlib import Path

from . import engine

AT = datetime(2026, 9, 29, 8, 0, tzinfo=engine.CDMX)
OUT = Path(__file__).resolve().parents[2] / "apps/web/src/features/bici-util/demo-snapshot.json"
KEEP = ("station_id", "ts", "bikes_available", "bikes_disabled", "useful_bikes", "is_renting",
        "pct_empty_hour", "docks_available", "capacity", "disabled_hours", "name", "short_name", "lat", "lon")


def main():
    d = engine.load()
    if not os.environ.get("C2_FILE"):
        d.suspected, d.c2_mode = {}, "PENDIENTE"
    stations = [{k: s[k] for k in KEEP} for s in engine.stations(d, AT) if s["lat"]]
    out = {
        "_meta": {"at_local": AT.strftime("%Y-%m-%dT%H:%M"), "generated_by": "modules.bici_util.export_demo"},
        "mode": d.mode,
        "c2_mode": d.c2_mode,
        "stations": stations,
        "hourly": engine.hourly(d),
        "clock": engine.clock(d, AT),
        "contract": engine.contract(d, AT),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"{OUT} · {len(stations)} estaciones · modo {d.mode} · C2 {d.c2_mode} · {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
