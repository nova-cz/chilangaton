from datetime import UTC, datetime, timedelta

from modules.regreso.gbfs import FeedProblem, StationReading
from modules.regreso.returns import WINDOW, evaluate, start
from modules.regreso.schemas import ClientBaseline, ReturnStatus

T0 = datetime(2026, 10, 25, 14, 0, tzinfo=UTC)


def reading(bikes=5, disabled=0, returning=True, at=T0):
    return StationReading(station_id="1", bikes_available=bikes, bikes_disabled=disabled,
                          docks_available=30 - bikes - disabled, is_installed=True,
                          is_returning=returning, last_reported=at, feed_updated=at)


def test_ve_una_bici_mas():
    check = start("1", reading(5), None, T0)
    assert check.status is ReturnStatus.REVISANDO
    evaluate(check, reading(6, at=T0 + timedelta(seconds=40)), T0 + timedelta(seconds=40))
    assert check.status is ReturnStatus.VEMOS_UNA_MAS


def test_bici_que_entra_deshabilitada_tambien_cuenta():
    check = start("1", reading(5), None, T0)
    evaluate(check, reading(5, disabled=1), T0 + timedelta(seconds=30))
    assert check.status is ReturnStatus.VEMOS_UNA_MAS


def test_sin_cambio_al_cerrar_la_ventana():
    check = start("1", reading(5), None, T0)
    evaluate(check, reading(5), T0 + timedelta(minutes=1))
    assert check.status is ReturnStatus.REVISANDO
    evaluate(check, reading(5), T0 + WINDOW)
    assert check.status is ReturnStatus.SIN_CAMBIO


def test_estado_final_no_cambia():
    check = start("1", reading(5), None, T0)
    evaluate(check, reading(5), T0 + WINDOW)
    evaluate(check, reading(7), T0 + WINDOW + timedelta(seconds=10))
    assert check.status is ReturnStatus.SIN_CAMBIO


def test_estacion_que_no_recibe_bicis_no_responde():
    check = start("1", reading(5, returning=False), None, T0)
    assert check.status is ReturnStatus.NO_RESPONDE


def test_hueco_del_feed_solo_cuenta_al_cerrar_la_ventana():
    check = start("1", reading(5), None, T0)
    evaluate(check, FeedProblem.CAIDO, T0 + timedelta(seconds=30))
    assert check.status is ReturnStatus.REVISANDO
    evaluate(check, FeedProblem.CAIDO, T0 + WINDOW)
    assert check.status is ReturnStatus.NO_RESPONDE


def test_feed_caido_al_anclar_compara_desde_la_primera_lectura():
    check = start("1", FeedProblem.CAIDO, None, T0)
    assert check.baseline is None
    evaluate(check, reading(5), T0 + timedelta(seconds=30))
    assert check.baseline.bikes_total == 5
    evaluate(check, reading(6), T0 + timedelta(seconds=60))
    assert check.status is ReturnStatus.VEMOS_UNA_MAS


def test_linea_base_de_la_app_detecta_si_el_feed_ya_sumo_la_bici():
    seen = ClientBaseline(bikes_available=5, observed_at=T0 - timedelta(minutes=2))
    check = start("1", reading(6), seen, T0)
    assert check.baseline.source == "app"
    assert check.status is ReturnStatus.VEMOS_UNA_MAS


def test_linea_base_vieja_de_la_app_se_ignora():
    seen = ClientBaseline(bikes_available=2, observed_at=T0 - timedelta(hours=1))
    check = start("1", reading(6), seen, T0)
    assert check.baseline.source == "feed"
    assert check.status is ReturnStatus.REVISANDO


def test_mensajes_nunca_dicen_viaje_cerrado():
    from modules.regreso.returns import MESSAGES
    assert all("cerrad" not in m.lower() for m in MESSAGES.values())
