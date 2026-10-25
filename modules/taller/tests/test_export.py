import json
from datetime import datetime, timedelta

import pytest

from modules.taller import engine
from shared.contracts.c2_priority import Priority

duckdb = pytest.importorskip("duckdb")
T0 = datetime(2026, 9, 21, 8, 0)    # lunes


def _write(path, rows):
    con = duckdb.connect()
    con.execute("CREATE TABLE t (bike_id VARCHAR, start_key VARCHAR, start_local TIMESTAMP,"
                " end_key VARCHAR, end_local TIMESTAMP)")
    con.executemany("INSERT INTO t VALUES (?, ?, ?, ?, ?)", rows)
    con.execute(f"COPY t TO '{path / 'trips_2026-09.parquet'}' (FORMAT parquet)")


def test_stations_map_covers_all_stations_and_has_no_collisions():
    m = engine.feed_ids()
    assert len(m) == 677 and len(set(m.values())) == 677
    assert m["271-272"] and m["710"]


def test_with_ids_feed_default_and_ce():
    key = "271-272"
    assert engine.with_ids({}, key)["station_id"] == engine.feed_ids()[key]
    assert engine.with_ids({}, key)["short_name"] == key
    assert engine.with_ids({}, key, "ce")["station_id"] == key
    assert engine.with_ids({}, "9999")["station_id"] == "9999"      # sin mapa: deja el código


def test_snapshot_mode_serves_exported_files(tmp_path):
    item = Priority(station_id="5", ts="2026-09-29T13:45:00+00:00", suspected_expected=2,
                    priority_score=1, top_signals=["bici ignorada"]).model_dump()
    (tmp_path / "c2_priority.json").write_text(json.dumps([item]))
    (tmp_path / "c2_priority.ce.json").write_text(json.dumps([{**item, "station_id": "271"}]))
    data = engine.Data(mode="REAL", snapshot_dir=tmp_path)
    assert engine.priority(data)[0]["station_id"] == "5"
    assert engine.priority(data, ids="ce")[0]["station_id"] == "271"
    assert engine.ignored_bikes(data) == []
    assert "271-272" in engine.known_stations(data)


def test_validation_compares_ignored_with_others(tmp_path):
    # A queda anclada en 271 mientras salen 35 bicis y ya no vuelve a salir (desaparece).
    # C queda anclada en 272, donde nadie sale, y vuelve a salir al día siguiente.
    rows = [("A", "100", T0 - timedelta(hours=2), "271", T0 - timedelta(hours=1)),
            ("C", "100", T0 - timedelta(hours=2), "272", T0 - timedelta(hours=1)),
            ("C", "272", T0 + timedelta(hours=20), "300", T0 + timedelta(hours=21))]
    rows += [(f"B{i}", "271", T0 - timedelta(minutes=50 - i), "999", T0 - timedelta(minutes=30 - i))
             for i in range(35)]
    rows += [("Z", "1", T0 + timedelta(days=4), "2", T0 + timedelta(days=4, hours=1))]   # fin de los datos
    _write(tmp_path, rows)
    out = engine.validation(engine.Data(mode="REAL", trips_dir=tmp_path), days=[T0])
    assert out["ignored"]["bikes"] == 1 and out["ignored"]["gone_72h"] == 1
    assert out["others"]["bikes"] >= 1 and out["others"]["rate"] < out["ignored"]["rate"]
