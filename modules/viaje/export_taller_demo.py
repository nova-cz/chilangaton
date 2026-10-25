"""Foto de /panel/taller para el modo demo (sin API).

    python -m modules.viaje.export_taller_demo

Une la prioridad de taller (C2), el riesgo de pérdida (C6) y la validación exportados en
modules/taller/real/ con los nombres de estación de modules/viaje/real/. Solo lee; no escribe en taller.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import engine

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "modules" / "taller" / "real"
OUT = ROOT / "apps" / "web" / "src" / "features" / "taller" / "demo-snapshot.json"


def main() -> None:
    names = {k: v.name for k, v in (engine.load_real() or engine.load_fixtures()).stations.items()}
    c2 = json.loads((SRC / "c2_priority.json").read_text(encoding="utf-8"))
    c6 = json.loads((SRC / "c6_loss_risk.json").read_text(encoding="utf-8"))
    val = json.loads((SRC / "validation.json").read_text(encoding="utf-8"))
    name = lambda sid: names.get(sid, f"Estación {sid}")  # noqa: E731
    c2.sort(key=lambda p: -p["priority_score"])
    snap = {
        "mode": "REAL",
        "ts": c2[0]["ts"] if c2 else None,
        "totals": {"stations": len(c2), "suspected": round(sum(p["suspected_expected"] for p in c2))},
        "priority": [{**p, "name": name(p["station_id"])} for p in c2[:50]],
        "loss_risk": [{**r, "name": name(r["station_id"])} for r in c6[:20]],
        "loss_total": sum(r["disappeared_bikes"] for r in c6),
        "validation": {"ignored_rate": val["ignored"]["rate"], "others_rate": val["others"]["rate"],
                       "ratio": val["ratio"], "ignored_bikes": val["ignored"]["bikes"],
                       "definition": val["definition"]},
    }
    OUT.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✔ {OUT} · {OUT.stat().st_size // 1024} KB · {len(snap['priority'])} prioridades")


if __name__ == "__main__":
    main()
