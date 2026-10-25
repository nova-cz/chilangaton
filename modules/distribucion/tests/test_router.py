from fastapi import FastAPI
from fastapi.testclient import TestClient

from modules.distribucion.router import router
from services.api.core.errors import register_error_handlers

app = FastAPI()
register_error_handlers(app)
app.include_router(router, prefix="/api/v1")
client = TestClient(app)


def test_contraflujo():
    body = client.get("/api/v1/contraflujo").json()
    assert body["viable"] in (True, False)
    assert "conclusion" in body


def test_simulation_single_scenario_is_labeled_simulated():
    body = client.get("/api/v1/simulation/results", params={"scenario": 10, "recovered": "true"}).json()
    assert body["label"] == "SIMULADO"
    assert body["recovered"] is True
    assert list(body["scenarios"]) == ["10"]


def test_simulation_all_scenarios_and_validation():
    body = client.get("/api/v1/simulation/results").json()
    assert list(body["scenarios"]) == ["0", "5", "10", "20"]
    bad = client.get("/api/v1/simulation/results", params={"scenario": 7})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "http_422"
