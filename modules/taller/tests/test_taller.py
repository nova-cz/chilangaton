import pytest
from fastapi.testclient import TestClient

from modules.taller import engine, router
from services.api.core.config import Settings
from services.api.main import create_app

client = TestClient(create_app(Settings()))


@pytest.fixture(autouse=True)
def example_data(monkeypatch):
    """Siempre modo EJEMPLO: aunque haya DATA_DIR, las pruebas no escriben en los datos reales."""
    monkeypatch.setattr(router, "DATA", engine.Data(mode="EJEMPLO", reports=engine._example("c4_reports")))


def test_module_loaded():
    body = client.get("/health").json()
    assert "taller" in body["modules"]["loaded"]


def test_priority_matches_c2():
    body = client.get("/api/v1/taller/priority").json()
    item = body["items"][0]
    assert {"station_id", "ts", "suspected_expected", "priority_score", "top_signals"} <= item.keys()


def test_loss_risk_never_accuses():
    for item in client.get("/api/v1/taller/loss-risk").json()["items"]:
        assert item["note"] == "riesgo, no robo comprobado"


def test_create_report():
    res = client.post("/api/v1/taller/reports", json={"station_id": "271", "type": "llanta"})
    assert res.status_code == 201
    assert res.json()["report_id"].startswith("r-")


def test_duplicate_report_returns_200():
    body = {"station_id": "273", "type": "frenos", "user_hash": "dup-test"}
    first = client.post("/api/v1/taller/reports", json=body)
    second = client.post("/api/v1/taller/reports", json=body)
    assert (first.status_code, second.status_code) == (201, 200)
    assert second.json()["report_id"] == first.json()["report_id"]


def test_report_rejects_unknown_type():
    res = client.post("/api/v1/taller/reports", json={"station_id": "271", "type": "robo"})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_error"


def test_validation_requires_export_in_example_mode():
    assert client.get("/api/v1/taller/validation").status_code == 404


def test_ids_param_is_validated():
    assert client.get("/api/v1/taller/priority?ids=ce").status_code == 200
    assert client.get("/api/v1/taller/priority?ids=otro").status_code == 422


def test_withdrawal_endpoint_discards_the_report():
    body = {"station_id": "273", "type": "cadena", "bike_id": "BX-1", "user_hash": "apartar-1"}
    created = client.post("/api/v1/taller/reports", json=body)
    res = client.post("/api/v1/taller/reports/withdrawals", json={"bike_id": "BX-1", "user_hash": "apartar-1"})
    assert res.status_code == 200 and res.json()["discarded"] == [created.json()["report_id"]]
    listed = client.get("/api/v1/taller/reports?station_id=273").json()["items"]
    mine = next(r for r in listed if r["report_id"] == created.json()["report_id"])
    assert mine["status"] == "descartado" and mine["confidence"] == 0.0
