from datetime import datetime

from modules.viaje import engine

D = engine.load_fixtures()
T = datetime(2026, 9, 29, 7, 45, tzinfo=engine.CDMX)


def test_probabilidades_en_rango_y_reproducibles():
    a = engine.simulate(D, "271", T, 15)
    b = engine.simulate(D, "271", T, 15)
    assert a == b
    assert 0 <= a["p_useful_bike"] <= 1 and 0 <= a["p_free_dock"] <= 1


def test_buenavista_se_vacia_y_reforma_se_llena():
    assert engine.simulate(D, "271", T, 30)["p_useful_bike"] < 0.8
    assert engine.simulate(D, "14", T, 20)["p_free_dock"] < 0.8


def test_contrato_c3():
    f = engine.forecast(D, "14", T)
    assert [x["horizon_min"] for x in f] == [15, 30, 60]
    assert set(f[0]) == {"station_id", "ts", "horizon_min", "p_useful_bike", "p_free_dock"}


def test_alternativa_respeta_caminata_maxima():
    r = engine.recommend(D, "271", "14", T, max_walk_min=5)
    assert all(a["walk_to_destination_min"] <= 5 for a in r["alternatives"])
    assert all(a["grace_min"] >= 10 for a in r["alternatives"])


def test_sin_alternativa_si_no_acepta_otra_estacion():
    r = engine.recommend(D, "271", "14", T, accept_alternative=False)
    assert r["alternatives"] == []


def test_evitar_esfuerzo_limita_a_2_min():
    r = engine.recommend(D, "271", "14", T, avoid_effort=True)
    assert r["preferences"]["max_walk_min"] == 2


def test_gracia():
    assert engine.grace_minutes(2) == 10 and engine.grace_minutes(7) == 14


def test_nunca_promete_100():
    assert engine.pct(0.996) == 99 and engine.pct(0.001) == 1 and engine.pct(0) == 0


def test_endpoints_web():
    from fastapi.testclient import TestClient
    from services.api.main import create_app

    c = TestClient(create_app())
    rows = c.get("/api/v1/viaje/stations").json()["stations"]
    sid = rows[0]["station_id"]
    f = c.get(f"/api/v1/viaje/stations/{sid}/forecast", params={"horizons": "15,45,90"}).json()
    assert [x["horizon_min"] for x in f["forecast"]] == [15, 45, 90] and f["station"]["station_id"] == sid
    assert c.get("/api/v1/viaje/stations/no-existe/forecast").status_code == 404


def test_c3_varias_estaciones():
    from fastapi.testclient import TestClient
    from services.api.main import create_app

    c = TestClient(create_app())
    r = c.get("/api/v1/viaje/forecast").json()
    assert r["forecast"] and set(r["forecast"][0]) == {"station_id", "ts", "horizon_min", "p_useful_bike", "p_free_dock"}


def test_merge_live_une_por_numero_de_estacion():
    base = engine.load_fixtures()
    base.mode = "REAL"
    live_states = {"g14": engine.State("g14", "2026-10-25T18:00:00+00:00", 3, 36)}
    out = engine.merge_live(base, {}, live_states, {"14": "g14", "271": "g271"})
    assert list(out.stations) == ["14"] and out.states["14"].useful_bikes == 3
    assert out.mode == "VIVO + baseline REAL"


def test_bicis_descompuestas_ocupan_anclaje():
    d = engine.load_fixtures()
    # 14: capacidad 39, 33 útiles, 1 descompuesta, 1 anclaje descompuesto, 4 libres → p(lugar) ya es baja
    now = engine.simulate(d, "14", T, 1)
    assert now["p_free_dock"] <= 1 and d.states["14"].docks_available == 4
    d.states["271"].docks_available = 0   # el feed dice que no hay lugar, aunque haya pocas bicis útiles
    assert engine.simulate(d, "271", T, 0.05)["p_free_dock"] < 0.1


def test_modo_real_usa_la_hora_de_la_repeticion():
    from modules.viaje import router
    old = router.DATA.mode
    try:
        router.DATA.mode = "REAL"
        assert router._now(None) == engine.REPLAY_AT
    finally:
        router.DATA.mode = old


def test_dispersion_menor_da_pronostico_mas_firme():
    d = engine.load_fixtures()
    d.disp = 1.0
    a = engine.simulate(d, "14", T, 45)
    d.disp = 0.2
    b = engine.simulate(d, "14", T, 45)
    assert 0 <= b["p_free_dock"] <= 1 and 0 <= a["p_free_dock"] <= 1
    assert abs(b["p_free_dock"] - 0.5) >= abs(a["p_free_dock"] - 0.5) - 0.05
