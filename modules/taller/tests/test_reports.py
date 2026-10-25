from datetime import datetime, timedelta, timezone

from modules.taller import engine


def _report(created, user="u1", station="271", type_="llanta"):
    return {"report_id": f"r-{created.minute}", "station_id": station, "bike_id": None,
            "type": type_, "source": "usuario", "user_hash": user,
            "created_at": created.isoformat(timespec="seconds")}


T = datetime(2026, 9, 22, 14, 0, tzinfo=timezone.utc)


def test_duplicate_within_30_min_is_not_stored_twice():
    data = engine.Data(mode="EJEMPLO")
    first, new1 = engine.add_report(data, _report(T))
    again, new2 = engine.add_report(data, _report(T + timedelta(minutes=10)))
    assert (new1, new2) == (True, False)
    assert again["report_id"] == first["report_id"]
    assert len(data.reports) == 1


def test_other_user_or_later_counts_again():
    data = engine.Data(mode="EJEMPLO")
    engine.add_report(data, _report(T))
    engine.add_report(data, _report(T + timedelta(minutes=5), user="u2"))
    engine.add_report(data, _report(T + timedelta(minutes=45)))
    assert len(data.reports) == 3


def test_reports_persist_to_file(tmp_path):
    path = tmp_path / "reports" / "reports.jsonl"
    data = engine.Data(mode="EJEMPLO", reports_file=path)
    engine.add_report(data, _report(T))
    assert engine._read_reports(path)[0]["station_id"] == "271"


def test_recent_reports_by_station_uses_last_24h():
    data = engine.Data(mode="EJEMPLO")
    engine.add_report(data, _report(T - timedelta(hours=2)))
    engine.add_report(data, _report(T - timedelta(hours=30), user="old"))
    engine.add_report(data, _report(T - timedelta(hours=1), station="18"))
    assert engine.recent_reports_by_station(data, T) == {"271": 1, "18": 1}


def test_list_filters_by_station_newest_first():
    data = engine.Data(mode="EJEMPLO")
    engine.add_report(data, _report(T, station="271"))
    engine.add_report(data, _report(T + timedelta(hours=1), station="271", user="u2"))
    engine.add_report(data, _report(T, station="18"))
    items = engine.list_reports(data, "271")
    assert [i["user_hash"] for i in items] == ["u2", "u1"]
