from datetime import datetime, timedelta

import pytest

from modules.taller import engine

duckdb = pytest.importorskip("duckdb")

T0 = datetime(2026, 9, 22, 7, 0)


def _write_trips(path, rows):
    con = duckdb.connect()
    con.execute("CREATE TABLE t (bike_id VARCHAR, start_key VARCHAR, start_local TIMESTAMP,"
                " end_key VARCHAR, end_local TIMESTAMP)")
    con.executemany("INSERT INTO t VALUES (?, ?, ?, ?, ?)", rows)
    con.execute(f"COPY t TO '{path / 'trips_2026-09.parquet'}' (FORMAT parquet)")


def test_flags_bike_left_while_many_depart(tmp_path):
    rows = [("A", "100", T0 - timedelta(minutes=30), "271", T0)]          # A queda anclada en 271
    rows += [(f"B{i}", "271", T0 + timedelta(minutes=5 * i + 1), "300",   # 35 salen de 271
              T0 + timedelta(minutes=5 * i + 20)) for i in range(35)]
    rows += [("C", "100", T0 - timedelta(minutes=30), "272", T0)]          # C en 272, nadie sale
    _write_trips(tmp_path, rows)
    data = engine.Data(mode="REAL", trips_dir=tmp_path)

    items = engine.ignored_bikes(data, T0 + timedelta(hours=4))

    assert [(i["bike_id"], i["station_key"]) for i in items] == [("A", "271")]
    assert items[0]["departures_while_docked"] == 35


def test_not_flagged_once_it_leaves(tmp_path):
    rows = [("A", "100", T0 - timedelta(minutes=30), "271", T0),
            ("A", "271", T0 + timedelta(minutes=10), "300", T0 + timedelta(minutes=30))]
    rows += [(f"B{i}", "271", T0 + timedelta(minutes=5 * i + 1), "300",
              T0 + timedelta(minutes=5 * i + 20)) for i in range(35)]
    _write_trips(tmp_path, rows)

    assert engine.ignored_bikes(engine.Data(mode="REAL", trips_dir=tmp_path), T0 + timedelta(hours=4)) == []


def test_example_mode_returns_nothing():
    assert engine.ignored_bikes(engine.Data(mode="EJEMPLO")) == []


def test_old_docking_is_not_ignored_but_stale(tmp_path):
    old = T0 - timedelta(days=5)
    rows = [("A", "100", old - timedelta(minutes=30), "271", old)]
    rows += [(f"B{i}", "271", T0 + timedelta(minutes=5 * i + 1), "300",
              T0 + timedelta(minutes=5 * i + 20)) for i in range(35)]
    _write_trips(tmp_path, rows)

    items = engine.ignored_bikes(engine.Data(mode="REAL", trips_dir=tmp_path), T0 + timedelta(hours=4))

    assert items[0]["signal"] == "sin movimiento 3+ días"
    assert engine.suspected_by_station(items) == {}
