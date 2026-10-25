"""Lo que ve /panel/casos: la cola sale de GET /cases y los contadores se calculan en la web.

Cada prueba usa su propio CaseStore en memoria (fixture `env`); nunca toca la API desplegada.
`panel_totals` repite la cuenta de apps/web/src/features/regreso/cases-view.tsx.
"""

from modules.regreso.tests.test_regreso_router import env  # noqa: F401  (fixture compartida)

REVIEW = {"en_revision", "devolucion_en_duda"}


def panel_totals(cases: list[dict]) -> dict[str, int]:
    real = [c for c in cases if not c["simulated"]]  # lo SIMULADO nunca entra a los indicadores
    open_ = [c for c in real if c["is_open"]]
    return {
        "open": len(open_),
        "review": sum(c["state"] in REVIEW for c in open_),
        "unassigned": sum(not c["assigned_to"] for c in open_),
        "reincorporated": sum(c["state"] == "reincorporada" for c in real),
    }


ZERO = {"open": 0, "review": 0, "unassigned": 0, "reincorporated": 0}


def test_sin_casos_la_cola_viene_vacia_y_los_contadores_en_cero(env):  # noqa: F811
    client, _, _ = env
    cases = client.get("/api/v1/cases").json()
    assert cases == []
    assert panel_totals(cases) == ZERO
    assert client.get("/api/v1/cases/count").json()["stations"] == []


def test_un_incidente_aparece_en_la_cola_y_mueve_los_contadores(env):  # noqa: F811
    client, _, _ = env
    # Robo y pérdida abren "en revisión": cuentan en abiertos y en "En revisión o en duda".
    r = client.post("/api/v1/incidents", json={"type": "robo", "station_id": "1"})
    assert r.status_code == 201
    case_id = r.json()["case"]["case_id"]

    cases = client.get("/api/v1/cases").json()
    assert [c["case_id"] for c in cases] == [case_id]
    assert panel_totals(cases) == {"open": 1, "review": 1, "unassigned": 1, "reincorporated": 0}

    r = client.post(f"/api/v1/cases/{case_id}/assign", json={"guardian_id": "g-1", "actor": "operador"})
    assert r.status_code == 200
    assert panel_totals(client.get("/api/v1/cases").json())["unassigned"] == 0
    assert client.get("/api/v1/cases/count").json()["stations"][0]["open_cases"] == 1


def test_los_escenarios_simulados_salen_en_la_cola_pero_no_cuentan(env):  # noqa: F811
    client, _, _ = env
    for key in ("sustraccion", "traslado_a_taller"):
        assert client.post(f"/api/v1/scenarios/{key}/run").json()["case"]["simulated"]

    cases = client.get("/api/v1/cases").json()
    assert len(cases) == 2 and all(c["simulated"] for c in cases)
    assert panel_totals(cases) == ZERO  # "sustraccion" termina reincorporada y aun así no suma
    assert client.get("/api/v1/cases/count").json()["stations"] == []

    client.post("/api/v1/incidents", json={"type": "perdida", "station_id": "1"})
    cases = client.get("/api/v1/cases").json()
    assert panel_totals(cases) == {"open": 1, "review": 1, "unassigned": 1, "reincorporated": 0}
    assert [s["station_id"] for s in client.get("/api/v1/cases/count").json()["stations"]] == ["1"]
