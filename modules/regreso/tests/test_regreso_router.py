from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from modules.regreso import router as regreso
from modules.regreso.cases import CaseStore
from modules.regreso.gbfs import FeedProblem, StationInfo, StationReading

T0 = datetime(2026, 10, 25, 14, 0, tzinfo=UTC)


class FakeFeed:
    def __init__(self):
        self.bikes = 5

    async def station(self, station_id, now):
        if station_id == "no-existe":
            return FeedProblem.SIN_ESTACION
        return StationReading(station_id=station_id, bikes_available=self.bikes, bikes_disabled=0,
                              docks_available=30 - self.bikes, is_installed=True, is_returning=True,
                              last_reported=now, feed_updated=now)


class FakeCatalog:
    def __init__(self, stations):
        self._stations = stations

    async def stations(self):
        return self._stations


@pytest.fixture
def env():
    feed, clock = FakeFeed(), {"now": T0}
    app = FastAPI()
    app.include_router(regreso.router, prefix="/api/v1")
    store, checks = CaseStore(), {}
    app.dependency_overrides[regreso.get_feed] = lambda: feed
    app.dependency_overrides[regreso.get_cases] = lambda: store
    app.dependency_overrides[regreso.get_returns] = lambda: checks
    app.dependency_overrides[regreso.now_utc] = lambda: clock["now"]
    app.dependency_overrides[regreso.get_catalog] = lambda: FakeCatalog(
        [StationInfo(station_id="1", code="710", name="CE-710 Molino del Rey", lat=19.41, lon=-99.19)])
    return TestClient(app), feed, clock


def test_flujo_ancle_aqui(env):
    client, feed, clock = env
    r = client.post("/api/v1/returns", json={"station_id": "1"})
    assert r.status_code == 201 and r.json()["status"] == "revisando"
    rid = r.json()["return_id"]

    feed.bikes, clock["now"] = 6, T0 + timedelta(seconds=45)
    r = client.get(f"/api/v1/returns/{rid}")
    assert r.json()["status"] == "vemos_una_mas"
    assert r.json()["message"] == "Vemos una bici más en la estación"


def test_flujo_de_caso_y_conteo(env):
    client, _, _ = env
    r = client.post("/api/v1/incidents", json={"type": "robo", "station_id": "1", "user_hash": "abc"})
    assert r.status_code == 201
    case = r.json()["case"]
    assert "user_hash" not in case

    r = client.post(f"/api/v1/cases/{case['case_id']}/transitions",
                    json={"to_state": "recuperada", "actor": "guardian"})
    assert r.status_code == 409

    r = client.get("/api/v1/cases/count")
    assert r.json()["stations"] == [{"station_id": "1", "open_cases": 1, "reincorporated": 0}]

    r = client.get("/api/v1/cases", params={"open": "true"})
    assert [c["case_id"] for c in r.json()] == [case["case_id"]]


def test_caso_inexistente(env):
    client, _, _ = env
    assert client.get("/api/v1/cases/nope").status_code == 404
    assert client.get("/api/v1/returns/nope").status_code == 404
    assert client.post("/api/v1/returns", json={"station_id": "no-existe"}).status_code == 404


def test_catalogo_de_estaciones(env):
    client, _, _ = env
    r = client.get("/api/v1/returns/stations")
    assert r.status_code == 200
    assert r.json() == [{"station_id": "1", "code": "710", "name": "CE-710 Molino del Rey",
                         "lat": 19.41, "lon": -99.19}]


def test_catalogo_caido(env):
    client, _, _ = env
    client.app.dependency_overrides[regreso.get_catalog] = lambda: FakeCatalog(None)
    assert client.get("/api/v1/returns/stations").status_code == 503


def test_escenarios_por_api(env):
    client, _, _ = env
    keys = [s["key"] for s in client.get("/api/v1/scenarios").json()]
    assert keys == ["estacion_desconectada", "sustraccion", "traslado_a_taller"]
    r = client.post("/api/v1/scenarios/sustraccion/run").json()
    assert r["passed"] and r["obtained"] == "reincorporada" and r["case"]["simulated"]
    assert client.get("/api/v1/cases/count").json()["stations"] == []
    assert client.post("/api/v1/scenarios/nope/run").status_code == 404
