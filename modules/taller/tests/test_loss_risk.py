from datetime import datetime, timedelta

import pytest

from modules.taller import engine
from shared.contracts.c6_loss_risk import LossRisk

duckdb = pytest.importorskip("duckdb")

AT = datetime(2026, 9, 30, 23, 0)


def _write(path, rows):
    con = duckdb.connect()
    con.execute("CREATE TABLE t (bike_id VARCHAR, start_key VARCHAR, start_local TIMESTAMP,"
                " end_key VARCHAR, end_local TIMESTAMP)")
    con.executemany("INSERT INTO t VALUES (?, ?, ?, ?, ?)", rows)
    con.execute(f"COPY t TO '{path / 'trips_2026-09.parquet'}' (FORMAT parquet)")


def _trip(bike, end_key, end_local):
    return (bike, "100", end_local - timedelta(minutes=20), end_key, end_local)


def test_counts_bikes_gone_three_weeks_by_band(tmp_path):
    old_evening = datetime(2026, 9, 2, 19, 30)
    _write(tmp_path, [
        _trip("A", "271", old_evening),                      # desaparece en 271, 18-21 h
        _trip("B", "271", old_evening + timedelta(minutes=5)),
        _trip("C", "18", datetime(2026, 9, 3, 8, 0)),       # desaparece en 18, 7-10 h
        _trip("D", "271", old_evening),                      # D vuelve a salir: no cuenta
        ("D", "271", datetime(2026, 9, 25, 9, 0), "300", datetime(2026, 9, 25, 9, 20)),
        _trip("E", "271", datetime(2026, 9, 25, 19, 0)),    # reciente: no cuenta
    ])
    items = engine.loss_risk(engine.Data(mode="REAL", trips_dir=tmp_path), AT)

    got = {(i["station_id"], i["time_band"]): i["disappeared_bikes"] for i in items}
    assert got == {("271", "18:00-21:00"): 2, ("18", "07:00-10:00"): 1}
    for i in items:
        LossRisk(**i)
        assert i["note"] == "riesgo, no robo comprobado"
