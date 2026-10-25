from datetime import datetime

import pandas as pd

from modules.bici_util import engine

D = engine.load_fixtures()
T = datetime(2026, 9, 30, 8, 0, tzinfo=engine.CDMX)
C1_FIELDS = {"station_id", "ts", "bikes_available", "bikes_disabled", "useful_bikes",
             "is_renting", "pct_empty_hour"}


def test_contrato_c1_tiene_campos_minimos():
    rows = engine.stations(D, T)
    assert rows and all(C1_FIELDS <= set(r) for r in rows)
    assert all(r["ts"].endswith("+00:00") for r in rows)   # se guarda en UTC


def test_bici_util_resta_sospechosas_y_no_deshabilitadas():
    r = {x["station_id"]: x for x in engine.stations(D, T)}["141"]
    assert r["useful_bikes"] == max(0, round(r["bikes_available"] - r["suspected_expected"]))
    assert r["suspected_expected"] == 2.0


def test_inventario_entre_cero_y_capacidad():
    for r in engine.stations(D, T):
        assert 0 <= r["useful_bikes"] <= r["bikes_available"] <= r["capacity"]


def test_estacion_cerrada_no_cuenta_deshabilitadas():
    closed = datetime(2026, 9, 30, 12, 0, tzinfo=engine.CDMX)
    r = {x["station_id"]: x for x in engine.stations(D, closed)}["279"]
    assert r["is_renting"] is False and r["bikes_disabled"] == 0 and r["useful_bikes"] == 0
    assert "279" not in {x["station_id"] for x in engine.clock(D, closed)["over_limit"]}


def test_noche_fuera_de_servicio():
    s = D.snaps
    night = s[s["ts"].dt.tz_convert(engine.CDMX).dt.hour.isin([1, 2, 3, 4])]
    assert not night["in_service"].any()


def test_reloj_36h_detecta_bici_que_nunca_se_retira():
    c = engine.clock(D)   # última foto: 136 lleva ~3 días con una deshabilitada
    over = {x["station_id"]: x for x in c["over_limit"]}
    assert "136" in over and over["136"]["hours"] > 36
    assert "134" not in over   # sus deshabilitadas son solo del último día


def test_hueco_largo_del_feed_rompe_la_racha():
    s = D.snaps[D.snaps["station_id"] == "136"]
    cut = s["ts"].iloc[len(s) // 2]
    gappy = engine.Data(D.stations, s[(s["ts"] < cut) | (s["ts"] > cut + pd.Timedelta(hours=8))],
                        {}, "EJEMPLO")
    h = engine.clock(gappy, limit_h=0)["over_limit"][0]["hours"]
    full = engine.clock(D, limit_h=0)["over_limit"]
    assert h < next(x["hours"] for x in full if x["station_id"] == "136") / 2 + 1


def test_indicadores_del_contrato():
    k = engine.contract(D)
    assert 0 <= k["pct_time_empty"]["value"] <= 1
    assert k["pct_time_empty"]["value_no_useful"] >= k["pct_time_empty"]["value"]
    assert k["stations_over_36h"]["value"] >= 1
    assert k["useful_peak_vs_5am"]["useful_at_5"] > 0


def test_normalize_acepta_columnas_del_feed():
    raw = pd.DataFrame([{"station_id": 14, "committed_at_utc": "2026-09-29T14:00:00Z",
                         "num_bikes_available": 3, "num_bikes_disabled": 1,
                         "num_docks_available": 30, "is_installed": 1, "is_renting": 1,
                         "is_returning": 1}])
    s = engine.normalize(raw)
    assert s.loc[0, "station_id"] == "14" and s.loc[0, "hour"] == 8   # 14:00 UTC = 8:00 CDMX


def test_c2_con_codigo_ce_se_traduce_a_station_id_del_feed():
    rows = [{"station_id": "271-272", "suspected_expected": 2}, {"station_id": "CE-014", "suspected_expected": 1},
            {"station_id": "999", "suspected_expected": 5}]
    assert engine.map_suspected(rows, D.stations, ids="ce") == {"141": 2.0, "267": 1.0}


def test_c2_con_station_id_del_feed_no_se_traduce():
    rows = [{"station_id": "141", "suspected_expected": 2}]
    assert engine.map_suspected(rows, D.stations, ids="gbfs") == {"141": 2.0}


def test_c2_acepta_respuesta_con_items():
    assert engine._c2_rows({"mode": "REAL", "items": [{"station_id": "1"}]}) == [{"station_id": "1"}]
