"""Foto grabada para /panel/taller (D6): `python -m modules.taller.export_web`.

Junta los JSON de `modules/taller/real/` (C2, C6, validación) con los nombres de estación de
la foto de la Línea 1 (solo lectura) y escribe `apps/web/src/features/taller/demo-snapshot.json`.
Así el panel funciona sin API y la API en vivo solo lo reemplaza.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from shared.contracts.station_ids import station_key

ROOT = Path(__file__).resolve().parents[2]
REAL = Path(__file__).parent / "real"
NAMES_SRC = ROOT / "apps/web/src/features/bici-util/demo-snapshot.json"
OUT = ROOT / "apps/web/src/features/taller/demo-snapshot.json"
TOP = 25


def _names() -> dict[str, str]:
    stations = json.loads(NAMES_SRC.read_text(encoding="utf-8"))["stations"]
    return {station_key(s["short_name"]): re.sub(r"^CE-\S+\s+", "", s["name"]) for s in stations if s.get("short_name")}


def main() -> None:
    c2 = json.loads((REAL / "c2_priority.json").read_text(encoding="utf-8"))
    c6 = json.loads((REAL / "c6_loss_risk.json").read_text(encoding="utf-8"))
    validation = json.loads((REAL / "validation.json").read_text(encoding="utf-8"))
    names = _names()
    c2.sort(key=lambda r: r["priority_score"], reverse=True)
    c6.sort(key=lambda r: r["disappeared_bikes"], reverse=True)
    ts = c2[0]["ts"]
    at_local = datetime.fromisoformat(ts).astimezone(ZoneInfo("America/Mexico_City")).strftime("%Y-%m-%dT%H:%M")
    used = {r["station_id"] for r in c2[:TOP] + c6[:TOP]}
    out = {
        "_meta": {"at_local": at_local, "ts": ts, "generado_por": "python -m modules.taller.export_web"},
        "mode": "REAL",
        "totals": {
            "suspected": sum(r["suspected_expected"] for r in c2),
            "stations_flagged": len(c2),
            "lost_bikes": sum(r["disappeared_bikes"] for r in c6),
        },
        "priority": c2[:TOP],
        "loss_risk": c6[:TOP],
        "names": {k: v for k, v in names.items() if k in used},
        "validation": validation,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"escrito {OUT.relative_to(ROOT)} · {len(out['priority'])} prioridades · {len(out['loss_risk'])} riesgos")


if __name__ == "__main__":
    main()
