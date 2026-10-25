from datetime import UTC, datetime, timedelta

import pytest

from modules.regreso.cases import CaseStore, InvalidTransition
from modules.regreso.schemas import Actor, BikeState as S, IncidentIn, IncidentType

T0 = datetime(2026, 10, 25, 14, 0, tzinfo=UTC)
G = Actor.GUARDIAN


def at(minutes):
    return T0 + timedelta(minutes=minutes)


def test_estado_inicial_segun_tipo():
    store = CaseStore()
    anclaje, _ = store.open(IncidentIn(type=IncidentType.ANCLAJE, station_id="1"), T0)
    robo, _ = store.open(IncidentIn(type=IncidentType.ROBO, station_id="1"), T0)
    assert anclaje.state is S.DEVOLUCION_EN_DUDA
    assert robo.state is S.EN_REVISION


def test_recuperacion_completa_termina_reincorporada():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.ROBO, station_id="1", bike_id="B-1"), T0)
    for i, to in enumerate([S.LOCALIZADA, S.RECUPERADA, S.TALLER, S.REINCORPORADA], 1):
        store.transition(case.case_id, to, G, at(i))
    assert not case.is_open
    assert [e.to_state for e in case.history][-1] is S.REINCORPORADA


def test_el_sistema_no_confirma_una_recuperacion():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.DISCREPANCIA, source=Actor.SISTEMA), T0)
    with pytest.raises(InvalidTransition):
        store.transition(case.case_id, S.LOCALIZADA, Actor.SISTEMA, at(1))


def test_el_sistema_si_cierra_una_devolucion_en_duda_confirmada():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.ANCLAJE, station_id="1"), T0)
    store.transition(case.case_id, S.EN_ESTACION, Actor.SISTEMA, at(2))
    assert not case.is_open


def test_transicion_invalida():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.ANCLAJE, station_id="1"), T0)
    with pytest.raises(InvalidTransition):
        store.transition(case.case_id, S.RECUPERADA, G, at(1))


def test_taller_sin_recuperacion_no_cuenta_como_reincorporada():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.DISCREPANCIA, station_id="1"), T0)
    store.transition(case.case_id, S.TALLER, Actor.OPERADOR, at(1))
    with pytest.raises(InvalidTransition):
        store.transition(case.case_id, S.REINCORPORADA, Actor.OPERADOR, at(2))
    store.transition(case.case_id, S.EN_ESTACION, Actor.OPERADOR, at(2))
    assert not case.is_open


def test_caso_cerrado_no_se_mueve():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.ANCLAJE, station_id="1"), T0)
    store.transition(case.case_id, S.EN_ESTACION, G, at(1))
    with pytest.raises(InvalidTransition):
        store.transition(case.case_id, S.EN_REVISION, G, at(2))


def test_segundo_reporte_de_la_misma_bici_se_suma_al_caso():
    store = CaseStore()
    first, created1 = store.open(IncidentIn(type=IncidentType.ROBO, bike_id="B-1"), T0)
    second, created2 = store.open(IncidentIn(type=IncidentType.PERDIDA, bike_id="B-1"), at(5))
    assert created1 and not created2
    assert second is first
    assert len(store.list()) == 1


def test_asignacion_solo_por_personas():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.ROBO, station_id="1"), T0)
    with pytest.raises(InvalidTransition):
        store.assign(case.case_id, "g-1", Actor.SISTEMA, at(1))
    store.assign(case.case_id, "g-1", Actor.OPERADOR, at(1))
    assert case.assigned_to == "g-1"


def test_conteo_c5_por_estacion():
    store = CaseStore()
    a, _ = store.open(IncidentIn(type=IncidentType.ROBO, station_id="1", bike_id="B-1"), T0)
    store.open(IncidentIn(type=IncidentType.ANCLAJE, station_id="1"), T0)
    store.open(IncidentIn(type=IncidentType.PERDIDA, station_id="2"), T0)
    store.open(IncidentIn(type=IncidentType.PERDIDA), T0)  # sin estación: no entra a C5
    for i, to in enumerate([S.LOCALIZADA, S.RECUPERADA, S.REINCORPORADA], 1):
        store.transition(a.case_id, to, G, at(i), station_id="3" if to is S.REINCORPORADA else None)

    counts = {c.station_id: (c.open_cases, c.reincorporated) for c in store.counts(at(5)).stations}
    assert counts == {"1": (1, 0), "2": (1, 0), "3": (0, 1)}


def test_siguientes_estados_respetan_la_regla_de_taller():
    store = CaseStore()
    case, _ = store.open(IncidentIn(type=IncidentType.DISCREPANCIA, station_id="1"), T0)
    assert set(case.next_states) == {S.EN_ESTACION, S.TRASLADO, S.TALLER, S.LOCALIZADA}
    store.transition(case.case_id, S.TALLER, G, at(1))
    assert case.next_states == [S.EN_ESTACION]
    store.transition(case.case_id, S.EN_ESTACION, G, at(2))
    assert case.next_states == []
