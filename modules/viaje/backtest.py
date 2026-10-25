"""Línea 3 · ¿qué tanto le atina el motor? Prueba con mañanas que el baseline NO vio.

    python -m modules.viaje.backtest --feed data/Sep.parquet --info data/station_information.json

Para cada mañana de prueba (29 y 30 de sep, 7:00–9:45 cada 15 min) toma el estado real del feed,
pronostica a 15/30/60 min con el baseline de real/ (1–28 sep) y compara con lo que el feed
mostró de verdad. Compara contra "persistencia" (suponer que nada cambia).

Escribe modules/viaje/real/backtest.json con las cifras para el pitch y para el panel.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import duckdb

from . import engine
from .build_real import load_info

UTC = ZoneInfo("UTC")
DAYS = [date(2026, 9, 29), date(2026, 9, 30)]
STARTS = [(h, m) for h in (7, 8, 9) for m in (0, 15, 30, 45)]
HORIZONS = (15, 30, 60)
TOL_MIN = 10          # foto real más cercana a ± 10 min del momento objetivo
N = 300               # escenarios por pronóstico (más rápido; el error de muestreo es ~3%)


def snapshots(con, feed: str, gbfs_to_key: dict):
    cols = [r[0] for r in con.execute(f"DESCRIBE SELECT * FROM read_parquet('{feed}')").fetchall()]
    tcol = next(c for c in ("committed_at_utc", "committed_at", "timestamp", "last_reported") if c in cols)
    t = f"CAST({tcol} AS TIMESTAMP)" if tcol != "last_reported" else f"to_timestamp({tcol})::TIMESTAMP"
    g = lambda c, d="0": c if c in cols else d  # noqa: E731
    lo = datetime(2026, 9, 29, 12, tzinfo=UTC)
    rows = con.execute(f"""
      SELECT CAST(station_id AS VARCHAR), {t}, {g('num_bikes_available')}, {g('num_docks_available')},
             {g('num_docks_disabled')}, {g('is_renting', 'true')}, {g('is_returning', 'true')}
      FROM read_parquet('{feed}')
      WHERE {t} >= TIMESTAMP '{lo:%Y-%m-%d %H:%M:%S}' ORDER BY 2""").fetchall()
    by: dict[str, list] = {}
    for sid, ts, nb, nd, ndd, rent, ret in rows:
        key = gbfs_to_key.get(sid) or engine.station_key(sid)
        by.setdefault(key, []).append((ts.replace(tzinfo=UTC), int(nb or 0), int(nd or 0), int(ndd or 0),
                                       bool(rent), bool(ret)))
    return by


def nearest(series, when: datetime):
    best = None
    for row in series:
        d = abs((row[0] - when).total_seconds()) / 60
        if d <= TOL_MIN and (best is None or d < best[0]):
            best = (d, row)
    return best[1] if best else None


def summarize(pairs):
    """pairs: (p_pronosticada, ocurrió 0/1, p_persistencia)."""
    n = len(pairs)
    if not n:
        return None
    brier = sum((p - y) ** 2 for p, y, _ in pairs) / n
    brier_pers = sum((q - y) ** 2 for _, y, q in pairs) / n
    bands = {}
    for name, lo, hi in (("verde", 0.8, 1.01), ("amarillo", 0.5, 0.8), ("rojo", 0.0, 0.5)):
        sel = [(p, y) for p, y, _ in pairs if lo <= p < hi]
        if sel:
            bands[name] = {"n": len(sel), "dijimos": round(sum(p for p, _ in sel) / len(sel), 3),
                           "paso": round(sum(y for _, y in sel) / len(sel), 3)}
    # De los casos que de verdad fallaron (no hubo), ¿cuántos avisamos con amarillo o rojo?
    misses = [(p, q) for p, y, q in pairs if y == 0]
    caught = sum(1 for p, _ in misses if p < 0.8) / len(misses) if misses else None
    caught_pers = sum(1 for _, q in misses if q < 0.8) / len(misses) if misses else None
    return {"n": n, "brier": round(brier, 4), "brier_persistencia": round(brier_pers, 4),
            "mejora_vs_persistencia": round(1 - brier / brier_pers, 3) if brier_pers else None,
            "fallos_reales": len(misses),
            "fallos_avisados": round(caught, 3) if caught is not None else None,
            "fallos_avisados_persistencia": round(caught_pers, 3) if caught_pers is not None else None,
            "bandas": bands}


def pc(x) -> str:
    return "—" if x is None else f"{x:.0%}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed", required=True)
    ap.add_argument("--info", required=True)
    a = ap.parse_args()
    data = engine.load_real()
    if not data:
        raise SystemExit("Primero corre build_real (falta modules/viaje/real/).")
    _, gbfs_to_key = load_info(a.info, [])
    by = snapshots(duckdb.connect(), a.feed, gbfs_to_key)
    bike = {h: [] for h in HORIZONS}
    dock = {h: [] for h in HORIZONS}

    for day in DAYS:
        for hh, mm in STARTS:
            t0 = datetime(day.year, day.month, day.day, hh, mm, tzinfo=engine.CDMX)
            for sid in data.stations:
                now = nearest(by.get(sid, []), t0.astimezone(UTC))
                if not now:
                    continue
                _, nb, nd, ndd, rent, ret = now
                if not (rent and ret):
                    continue
                data.states[sid] = engine.State(sid, now[0].isoformat(), nb, nd, ndd, rent, ret)
                for h in HORIZONS:
                    fut = nearest(by[sid], (t0 + timedelta(minutes=h)).astimezone(UTC))
                    if not fut:
                        continue
                    r = engine.simulate(data, sid, t0, h, n=N)
                    bike[h].append((r["p_useful_bike"], int(fut[1] >= 1), float(nb >= 1)))
                    dock[h].append((r["p_free_dock"], int(fut[2] >= 1), float(nd >= 1)))
        print(f"  {day}: listo")

    result = {"dias_prueba": [str(d) for d in DAYS], "horas": "07:00–09:45 cada 15 min",
              "baseline": "1–28 sep 2026", "escenarios": N,
              "bici": {str(h): summarize(bike[h]) for h in HORIZONS},
              "lugar": {str(h): summarize(dock[h]) for h in HORIZONS}}
    (engine.REAL_DIR / "backtest.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")

    print("\nResultados (mañanas que el modelo no vio):")
    for kind, label in (("bici", "bici útil"), ("lugar", "lugar para anclar")):
        for h in HORIZONS:
            s = result[kind][str(h)]
            if not s:
                print(f"  {label} a {h} min: sin datos")
                continue
            v = s["bandas"].get("verde")
            print(f"  {label} a {h} min · {s['n']:,} casos · Brier {s['brier']} (persistencia {s['brier_persistencia']}, "
                  f"mejora {pc(s['mejora_vs_persistencia'])})")
            if v:
                print(f"      cuando dijimos 'muy probable' ({pc(v['dijimos'])}) pasó {pc(v['paso'])} de las veces")
            if s["fallos_avisados"] is not None:
                print(f"      de {s['fallos_reales']} veces que NO hubo, avisamos {pc(s['fallos_avisados'])} "
                      f"(persistencia: {pc(s['fallos_avisados_persistencia'])})")
    print("\n✔ modules/viaje/real/backtest.json")


if __name__ == "__main__":
    main()
