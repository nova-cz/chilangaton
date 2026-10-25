from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

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


@pytest.mark.parametrize("scenario", ["7", "-1", "10.5", "abc", ""])
def test_invalid_scenario_uses_validation_error(scenario):
    bad = client.get("/api/v1/simulation/results", params={"scenario": scenario})
    assert bad.status_code == 422
    assert bad.json()["error"]["code"] == "validation_error"
    assert bad.json()["error"]["details"][0]["loc"] == ["query", "scenario"]


@pytest.mark.parametrize("scenario", [0, 5, 10, 20])
def test_valid_scenarios(scenario):
    response = client.get("/api/v1/simulation/results", params={"scenario": scenario})
    assert response.status_code == 200
    assert list(response.json()["scenarios"]) == [str(scenario)]
