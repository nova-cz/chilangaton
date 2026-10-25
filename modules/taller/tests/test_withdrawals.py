from datetime import datetime, timedelta, timezone

from modules.taller import engine

T = datetime(2026, 9, 29, 14, 0, tzinfo=timezone.utc)


def _r(rid, minutes=0, user="u1", bike="B1", station="271-272", source="usuario"):
    return {"report_id": rid, "station_id": station, "bike_id": bike, "type": "llanta", "source": source,
            "user_hash": user, "created_at": (T + timedelta(minutes=minutes)).isoformat(timespec="seconds")}


def _data(*reports, file=None):
    data = engine.Data(mode="EJEMPLO", reports_file=file)
    for r in reports:
        engine.add_report(data, r)
    return data


def test_withdrawal_within_5_min_discards_the_report():
    data = _data(_r("r1"))
    dropped = engine.register_withdrawal(data, "B1", "u1", T + timedelta(minutes=4, seconds=59))
    assert [r["report_id"] for r in dropped] == ["r1"]
    assert data.reports[0]["status"] == "descartado" and "5 min" in data.reports[0]["discard_reason"]
    assert engine.confidence(data.reports[0], data.reports) == 0.0


def test_withdrawal_after_5_min_or_by_someone_else_keeps_it():
    data = _data(_r("r1"), _r("r2", user="u2", bike="B2"))
    assert engine.register_withdrawal(data, "B1", "u1", T + timedelta(minutes=6)) == []
    assert engine.register_withdrawal(data, "B2", "u1", T + timedelta(minutes=1)) == []   # otra persona
    assert engine.register_withdrawal(data, "B1", "u1", T - timedelta(minutes=1)) == []   # retiro antes del reporte
    assert all(r["status"] == "valido" for r in data.reports)


def test_confidence_rises_with_another_person_and_drops_when_discarded():
    data = _data(_r("r1"), _r("r2", minutes=30, user="u2"), _r("r3", user="u3", bike="B9", source="taller"))
    by_id = {r["report_id"]: engine.confidence(r, data.reports) for r in data.reports}
    assert by_id == {"r1": 0.7, "r2": 0.7, "r3": 0.9}
    engine.register_withdrawal(data, "B1", "u1", T + timedelta(minutes=2))
    assert engine.confidence(data.reports[1], data.reports) == 0.5       # ya no tiene corroboración


def test_discarded_and_low_confidence_reports_do_not_flag_stations():
    data = _data(_r("r1"), _r("r2", user="u2", bike="B2", station="18"))
    engine.register_withdrawal(data, "B1", "u1", T + timedelta(minutes=1))
    assert engine.recent_reports_by_station(data, T + timedelta(hours=1)) == {"18": 1}


def test_discard_survives_a_restart(tmp_path):
    path = tmp_path / "reports" / "reports.jsonl"
    data = _data(_r("r1"), file=path)
    engine.register_withdrawal(data, "B1", "u1", T + timedelta(minutes=1))
    again = engine._read_reports(path)
    assert len(again) == 1 and again[0]["status"] == "descartado"
