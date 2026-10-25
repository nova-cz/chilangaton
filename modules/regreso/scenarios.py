"""R4 · Tres escenarios SIMULADOS con verdad conocida, sobre estaciones reales.

Los eventos de cada bici (anclaje, traslado, taller, robo) no son públicos: el feed solo da conteos por
estación. Por eso se simulan como pide el plan: misma entrada, mismo resultado, y etiqueta SIMULADO.
Se reproducen con la misma máquina de estados y las mismas reglas de actor que un caso real.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from .cases import CaseStore
from .schemas import Actor, BikeState, IncidentIn, IncidentType

S, A = BikeState, Actor


@dataclass(frozen=True)
class Step:
    after_min: int
    to: BikeState
    actor: Actor
    note: str
    station_id: str | None = None


@dataclass(frozen=True)
class Scenario:
    key: str
    title: str
    story: str
    incident: IncidentIn
    steps: tuple[Step, ...]
    expected: BikeState
    outcome: str
    assign_to: str | None = None


# station_id del feed: 267 = CE-014 Reforma - Río de Plata, 279 = CE-027 Reforma - Havre,
# 292 = CE-001 Río Sena - Río Balsas. Matrículas SIM-xxxx para que nunca se confundan con bicis reales.
SCENARIOS: dict[str, Scenario] = {
    s.key: s
    for s in (
        Scenario(
            key="estacion_desconectada",
            title="Estación desconectada",
            story="Una persona ancla en CE-014 justo cuando la estación deja de reportar. «Anclé aquí» responde "
                  "«La estación no responde» y pide revisión. Al reconectarse, la estación suma la bici.",
            incident=IncidentIn(type=IncidentType.ANCLAJE, source=A.APP, station_id="267", bike_id="SIM-0001",
                                note="«Anclé aquí»: la estación no responde"),
            steps=(Step(14, S.EN_ESTACION, A.SISTEMA, "La estación volvió a reportar y suma la bici"),),
            expected=S.EN_ESTACION,
            outcome="Resuelto sin pérdida; con la regla de no cobro por falla del sistema, no hay excedente.",
        ),
        Scenario(
            key="sustraccion",
            title="Sustracción",
            story="Una bici anclada en CE-027 se mueve sin viaje abierto (señal de ubicación SIMULADA). Se abre un "
                  "caso para revisión; un Guardián la localiza y se recupera con apoyo de la SSC, sin persecución.",
            incident=IncidentIn(type=IncidentType.DISCREPANCIA, source=A.SISTEMA, station_id="279",
                                bike_id="SIM-0002", note="Movimiento sin viaje (señal SIMULADA)"),
            assign_to="Guardián Reforma",
            steps=(
                Step(20, S.LOCALIZADA, A.GUARDIAN, "Ubicada por una señal reciente; aviso a la SSC"),
                Step(75, S.RECUPERADA, A.GUARDIAN, "Recuperada con apoyo de la SSC"),
                Step(90, S.TALLER, A.OPERADOR, "Revisión de daños"),
                Step(240, S.REINCORPORADA, A.OPERADOR, "De vuelta al servicio", station_id="279"),
            ),
            expected=S.REINCORPORADA,
            outcome="La bici vuelve a sumar al servicio y cuenta como reincorporada.",
        ),
        Scenario(
            key="traslado_a_taller",
            title="Traslado a taller",
            story="Una bici deja de aparecer en CE-001 sin viaje. Parece pérdida, pero el operador la había "
                  "llevado a taller.",
            incident=IncidentIn(type=IncidentType.DISCREPANCIA, source=A.SISTEMA, station_id="292",
                                bike_id="SIM-0003", note="Bici que deja de aparecer sin viaje"),
            steps=(
                Step(30, S.TRASLADO, A.OPERADOR, "El operador confirma que la trasladó"),
                Step(35, S.TALLER, A.OPERADOR, "Ingresó a taller"),
                Step(180, S.EN_ESTACION, A.OPERADOR, "Reparada y de vuelta en estación", station_id="292"),
            ),
            expected=S.EN_ESTACION,
            outcome="No era robo: se cierra sin contar como recuperación.",
        ),
    )
}


def run(store: CaseStore, key: str, now: datetime):
    """Reproduce el escenario completo para que termine en `now`. Devuelve (escenario, caso)."""
    scenario = SCENARIOS[key]
    start = now - timedelta(minutes=scenario.steps[-1].after_min)
    case, _ = store.open(scenario.incident, start, simulated=True)
    if scenario.assign_to:
        store.assign(case.case_id, scenario.assign_to, A.OPERADOR, start + timedelta(minutes=5))
    for step in scenario.steps:
        store.transition(case.case_id, step.to, step.actor, start + timedelta(minutes=step.after_min),
                         note=step.note, station_id=step.station_id)
    return scenario, case
