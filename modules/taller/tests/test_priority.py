from datetime import datetime, timedelta

import pytest

from modules.taller import engine
from shared.contracts.c2_priority import Priority

duckdb = pytest.importorskip("duckdb")

T0 = datetime(2026, 9, 22, 7, 0)   # martes


def _write(path, rows):
    con = duckdb.connect()
    con.execute("CREATE TABLE t (bike_id VARCHAR, start_key VARCHAR, start_local TIMESTAMP,"
                " end_key VARCHAR, end_local TIMESTAMP)")
    con.executemany("INSERT INTO t VALUES (?, ?, ?, ?, ?)", rows)
    con.execute(f"COPY t TO '{path / 'trips_2026-09.parquet'}' (FORMAT parquet)")


def _busy(station, n, prefix):
    return [(f"{prefix}{i}", station, T0 + timedelta(minutes=2 * i + 1), "999",
             T0 + timedelta(minutes=2 * i + 15)) for i in range(n)]


def test_priority_ranks_busier_station_first(tmp_path):
    rows = [("A1", "100", T0 - timedelta(hours=1), "271", T0),
            ("A2", "100", T0 - timedelta(hours=1), "271", T0),
            ("B1", "100", T0 - timedelta(hours=1), "18", T0)]
    rows += _busy("271", 80, "x") + _busy("18", 40, "y")
    _write(tmp_path, rows)
    data = engine.Data(mode="REAL", trips_dir=tmp_path)

    items = engine.priority(data, T0 + timedelta(hours=3))

    assert [i["station_id"] for i in items] == ["271", "18"]
    assert items[0]["priority_score"] == 1.0
    assert items[0]["suspected_expected"] == 2
    assert items[0]["empty_share"] is None
    Priority(**items[0])                       # cumple el contrato C2
    assert items[0]["ts"].endswith("+00:00")   # C2 va en UTC


def test_example_mode_keeps_c2_example():
    items = engine.priority(engine.Data(mode="EJEMPLO"))
    assert items[0]["station_id"] == "271"
