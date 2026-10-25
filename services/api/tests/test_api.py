from fastapi.testclient import TestClient

from services.api.core.config import Settings
from services.api.main import create_app


def client(**overrides: object) -> TestClient:
    return TestClient(create_app(Settings(**overrides)))


def test_health_ok() -> None:
    res = client().get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "distribucion" in body["modules"]["loaded"]
    assert body["modules"]["failed"] == {}


def test_demo_stations_labeled() -> None:
    res = client().get("/api/v1/demo/stations")
    assert res.status_code == 200
    body = res.json()
    assert body["label"] == "DEMO"
    assert len(body["stations"]) > 0


def test_demo_disabled_outside_demo_mode() -> None:
    res = client(demo_mode=False).get("/api/v1/demo/stations")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "http_404"


def test_enabled_modules_filter() -> None:
    body = client(enabled_modules=["otro"]).get("/health").json()
    assert body["modules"]["loaded"] == []
    assert "distribucion" in body["modules"]["skipped"]


def test_cors_from_env() -> None:
    c = client(cors_origins="https://ejemplo.app")
    res = c.get("/health", headers={"Origin": "https://ejemplo.app"})
    assert res.headers["access-control-allow-origin"] == "https://ejemplo.app"
