"""Exporta el snapshot de la Línea 2 a modules/taller/real/ (chico, se sube a git).

    set DATA_DIR=data            (con data/trips/trips_*.parquet)
    python -m modules.taller.export_real [--at 2026-09-29T07:45] [--skip-validation]

Deja en modules/taller/real/:
    c2_priority.json / c2_priority.feed.json    station_id = código CE (L1 y L3) / id del feed
    c6_loss_risk.json / c6_loss_risk.feed.json
    validation.json                           bici ignorada vs las demás (desaparece >72 h)
Con eso la API sirve datos REAL sin DATA_DIR (Railway) y L1/L3 pueden leer C2 por archivo.
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

from . import engine
from shared.contracts.c2_priority import Priority
from shared.contracts.c6_loss_risk import LossRisk


def _dump(name: str, items) -> None:
    path = engine.REAL_DIR / name
    path.write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {path.name}: {len(items) if hasattr(items, '__len__') else ''} registros")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--at", default=engine.DEMO_AT.isoformat(timespec="minutes"), help="hora CDMX del C2")
    ap.add_argument("--skip-validation", action="store_true")
    args = ap.parse_args()
    data_dir = os.getenv("DATA_DIR")
    if not data_dir:
        raise SystemExit("Define DATA_DIR (carpeta con trips/trips_*.parquet)")
    data = engine.Data(mode="REAL", trips_dir=Path(data_dir).resolve() / "trips")
    engine.REAL_DIR.mkdir(exist_ok=True)
    at = datetime.fromisoformat(args.at)
    print(f"Exportando a {engine.REAL_DIR} (C2 a las {at:%Y-%m-%d %H:%M} CDMX)…")
    for ids, suffix in (("ce", ""), ("feed", ".feed")):
        c2 = [Priority(**p).model_dump() for p in engine.priority(data, at, ids)]
        c6 = [LossRisk(**r).model_dump() for r in engine.loss_risk(data, None, ids)]
        _dump(f"c2_priority{suffix}.json", c2)
        _dump(f"c6_loss_risk{suffix}.json", c6)
    if not args.skip_validation:
        print("Validación de bici ignorada (tarda un poco)…")
        v = engine.validation(data)
        _dump("validation.json", v)
        print(f"  ignoradas {v['ignored']['rate']:.1%} vs demás {v['others']['rate']:.1%} → {v['ratio']}×")


if __name__ == "__main__":
    main()
