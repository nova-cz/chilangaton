from fastapi.testclient import TestClient

from services.api.core.config import Settings
from services.api.main import create_app

client = TestClient(create_app(Settings()))


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
