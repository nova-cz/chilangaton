from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from modules.distribucion.missions import MissionStore
from modules.distribucion.router import mission_store
from services.api.core.config import Settings
from services.api.main import create_app

USER = "demo-user-123"


def store():
    stations = [dict(id=s, capacity=10, bikes_available=5, docks_available=5, zone=z) for s, z in [("A", "Reforma"), ("B", "Buenavista"), ("C", "San Rafael")]]
    missions = [dict(id=mid, from_station_id=a, to_station_id=b, points=40, title=mid, window_label="DEMO") for mid, a, b in [("out", "A", "B"), ("back", "B", "A"), ("other", "A", "C")]]
    return MissionStore(missions, stations, new_stations={"B"})


def test_points_frozen_at_acceptance_with_zone_weight_and_new_station_bonus():
    s = store()
    accepted = s.accept("out", USER, "bike-1", "unlock")["acceptance"]
    assert accepted["frozen_reward"] == {"points": 70, "reward_days": 0.7, "zone_weight": 1.25, "new_station_bonus": 20}
    s.zone_weights["Buenavista"] = Decimal("3")
    s.new_stations.clear()
    s.missions["out"]["points"] = 900
    result = s.complete("out", USER, accepted["id"], ["A", "B"], "deliver")
    assert result["account"]["points"] == 70
    assert result["account"]["reward_days"] == 0.7


def test_duplicate_acceptance_and_delivery_do_not_pay_twice_even_concurrently():
    s = store()
    a = s.accept("out", USER, "bike-1", "unlock")["acceptance"]
    assert s.accept("out", USER, "bike-1", "unlock-again")["acceptance"]["id"] == a["id"]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda i: s.complete("out", USER, a["id"], ["A", "B"], f"deliver-{i}"), range(12)))
    assert all(r["account"]["points"] == 70 for r in results)
    assert len(s.listing(USER)["account"]["ledger"]) == 1


def test_request_id_cannot_be_reused_with_another_payload():
    s = store()
    s.accept("out", USER, "bike-1", "same-key")
    with pytest.raises(HTTPException) as exc:
        s.accept("other", USER, "bike-1", "same-key")
    assert exc.value.status_code == 409


@pytest.mark.parametrize("path", [["A", "B", "A"], ["A", "C"], ["A", "B", "A", "B"]])
def test_round_trip_and_wrong_destination_do_not_pay(path):
    s = store()
    a = s.accept("out", USER, "bike-1", "unlock")["acceptance"]
    result = s.complete("out", USER, a["id"], path, "deliver")
    assert result["acceptance"]["status"] == "rejected"
    assert result["account"]["points"] == 0
    assert result["account"]["ledger"] == []


def test_round_trip_split_into_two_missions_has_zero_net_reward():
    s = store()
    out = s.accept("out", USER, "bike-1", "out-unlock")["acceptance"]
    s.complete("out", USER, out["id"], ["A", "B"], "out-end")
    back = s.accept("back", USER, "bike-1", "back-unlock")["acceptance"]
    result = s.complete("back", USER, back["id"], ["B", "A"], "back-end")
    assert result["account"]["points"] == 0
    assert [e["points"] for e in result["account"]["ledger"]] == [70, -70]
    assert s.complete("back", USER, back["id"], ["B", "A"], "back-end-again")["account"]["points"] == 0


@pytest.mark.parametrize("station,field,value", [("A", "is_renting", False), ("B", "is_returning", False), ("A", "capacity", 0), ("B", "capacity", 0), ("A", "bikes_available", 0), ("B", "docks_available", 0)])
def test_closed_or_unavailable_stations_cannot_offer_missions(station, field, value):
    s = store()
    s.stations[station][field] = value
    assert not any(m["id"] == "out" for m in s.listing(USER)["missions"])
    with pytest.raises(HTTPException) as exc:
        s.accept("out", USER, "bike-1", "unlock")
    assert exc.value.status_code == 409


def test_one_active_mission_per_person_and_bike():
    s = store()
    s.accept("out", USER, "bike-1", "unlock")
    for user, bike in [(USER, "bike-2"), ("another-user", "bike-1")]:
        with pytest.raises(HTTPException) as exc:
            s.accept("other", user, bike, "another-unlock")
        assert exc.value.status_code == 409


def test_acceptance_cannot_be_completed_by_another_user():
    s = store()
    a = s.accept("out", USER, "bike-1", "unlock")["acceptance"]
    with pytest.raises(HTTPException) as exc:
        s.complete("out", "another-user", a["id"], ["A", "B"], "deliver")
    assert exc.value.status_code == 404


def test_api_mission_flow_and_validation():
    app = create_app(Settings(demo_mode=True))
    # Una instancia compartida por los tres requests de esta prueba.
    instance = store()
    app.dependency_overrides[mission_store] = lambda: instance
    c = TestClient(app)
    catalog = c.get("/api/v1/missions", params={"user_hash": USER})
    assert catalog.status_code == 200 and catalog.json()["label"] == "DEMO"
    accepted = c.post("/api/v1/missions/out/accept", json={"user_hash": USER, "bike_id": "bike-1", "request_id": "unlock"})
    assert accepted.status_code == 200
    body = {"user_hash": USER, "acceptance_id": accepted.json()["acceptance"]["id"], "request_id": "deliver", "station_ids": ["A", "B"]}
    result = c.post("/api/v1/missions/out/complete", json=body)
    assert result.status_code == 200 and result.json()["account"]["points"] == 70
    assert c.post("/api/v1/missions/out/complete", json=body).json()["account"]["points"] == 70
    invalid = c.post("/api/v1/missions/out/accept", json={"user_hash": "", "bike_id": "b", "request_id": "i"})
    assert invalid.status_code == 422 and invalid.json()["error"]["code"] == "validation_error"


def test_missions_are_disabled_outside_demo_mode():
    c = TestClient(create_app(Settings(demo_mode=False)))
    assert c.get("/api/v1/missions", params={"user_hash": USER}).status_code == 404
    assert c.post("/api/v1/missions/out/accept", json={"user_hash": USER, "bike_id": "bike-1", "request_id": "unlock"}).status_code == 404
