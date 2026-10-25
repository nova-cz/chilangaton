from datetime import UTC, datetime

import pytest

from modules.regreso import scenarios
from modules.regreso.cases import CaseStore
from modules.regreso.schemas import IncidentIn, IncidentType

T0 = datetime(2026, 10, 25, 14, 0, tzinfo=UTC)


@pytest.mark.parametrize("key", list(scenarios.SCENARIOS))
def test_cada_escenario_da_su_resultado_esperado(key):
    store = CaseStore()
    scenario, case = scenarios.run(store, key, T0)
    assert case.state is scenario.expected
    assert case.simulated
    assert case.updated_at == T0


def test_misma_entrada_mismo_resultado():
    a = [e.to_state for e in scenarios.run(CaseStore(), "sustraccion", T0)[1].history]
    b = [e.to_state for e in scenarios.run(CaseStore(), "sustraccion", T0)[1].history]
    assert a == b


def test_lo_simulado_no_entra_al_contrato_c5():
    store = CaseStore()
    scenarios.run(store, "sustraccion", T0)
    assert store.counts(T0).stations == []
    store.open(IncidentIn(type=IncidentType.ROBO, station_id="279"), T0)
    assert [(c.station_id, c.open_cases) for c in store.counts(T0).stations] == [("279", 1)]


def test_un_reporte_real_no_se_suma_a_un_caso_simulado():
    store = CaseStore()
    sim, _ = store.open(IncidentIn(type=IncidentType.ROBO, bike_id="B-1"), T0, simulated=True)
    real, created = store.open(IncidentIn(type=IncidentType.ROBO, bike_id="B-1"), T0)
    assert created and real is not sim and not real.simulated
