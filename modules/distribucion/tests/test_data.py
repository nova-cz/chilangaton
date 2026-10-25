from datetime import datetime

import pandas as pd

from modules.distribucion.data import load_feed


def test_feed_snapshot_preserves_operating_flags_and_fails_closed_on_null(tmp_path):
    rows = []
    for stamp in ["2026-09-29T12:55:00Z", "2026-09-29T13:01:00Z"]:
        for code, renting in [("CE-001", True), ("CE-002", False), ("CE-003", None)]:
            rows.append(dict(short_name=code, committed_at_utc=pd.Timestamp(stamp), capacity=10, num_bikes_available=2, num_bikes_disabled=1, num_docks_available=7, is_installed=True, is_renting=renting, is_returning=True))
    pd.DataFrame(rows).to_parquet(tmp_path / "Sep.parquet")
    feed = load_feed(tmp_path, at_utc=datetime(2026, 9, 29, 13))
    assert len(feed) == 3
    assert set(feed.ts_utc) == {pd.Timestamp("2026-09-29T13:01:00Z")}
    assert feed.set_index("code").is_renting.to_dict() == {"1": True, "2": False, "3": False}
    assert set(feed.ts_local) == {pd.Timestamp("2026-09-29T07:01:00")}
