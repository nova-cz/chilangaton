"""R4 · Casos de Regreso Seguro: la bici desde el reporte hasta que vuelve al servicio.

Ninguna transición acusa a una persona: los estados describen dónde está la bici, no quién la tiene.
La app y las reglas automáticas solo abren casos o confirman que la bici volvió a la estación;
todo lo demás lo decide una persona (Guardián u operador).
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

from shared.contracts.c5_cases_count import CasesCount, CasesCountResponse

from .schemas import Actor, BikeState, CaseEvent, IncidentIn, IncidentType

S = BikeState

INITIAL_STATE = {
    IncidentType.ANCLAJE: S.DEVOLUCION_EN_DUDA,
    IncidentType.VIAJE_LARGO: S.EN_VIAJE,
    IncidentType.ROBO: S.EN_REVISION,
    IncidentType.PERDIDA: S.EN_REVISION,
    IncidentType.DISCREPANCIA: S.EN_REVISION,
}

# en_estacion (resuelto sin pérdida) y reincorporada cierran el caso.
TRANSITIONS: dict[BikeState, set[BikeState]] = {
    S.EN_VIAJE: {S.EN_ESTACION, S.DEVOLUCION_EN_DUDA, S.EN_REVISION},
    S.DEVOLUCION_EN_DUDA: {S.EN_ESTACION, S.EN_REVISION},
    S.EN_REVISION: {S.EN_ESTACION, S.TRASLADO, S.TALLER, S.LOCALIZADA},
    S.TRASLADO: {S.EN_ESTACION, S.TALLER},
    S.TALLER: {S.EN_ESTACION, S.REINCORPORADA},
    S.LOCALIZADA: {S.RECUPERADA, S.EN_REVISION},
    S.RECUPERADA: {S.TALLER, S.REINCORPORADA},
    S.EN_ESTACION: set(),
    S.REINCORPORADA: set(),
}
CLOSED = {S.EN_ESTACION, S.REINCORPORADA}
HUMANS = {Actor.GUARDIAN, Actor.OPERADOR}
# Lo único que la app o el sistema pueden mover sin una persona.
AUTOMATIC = {
    (S.EN_VIAJE, S.EN_ESTACION),
    (S.EN_VIAJE, S.DEVOLUCION_EN_DUDA),
    (S.EN_VIAJE, S.EN_REVISION),
    (S.DEVOLUCION_EN_DUDA, S.EN_ESTACION),
}


class CaseNotFound(LookupError):
    pass


class InvalidTransition(ValueError):
    pass


@dataclass
class Case:
    case_id: str
    type: IncidentType
    source: Actor
    state: BikeState
    station_id: str | None
    bike_id: str | None
    return_id: str | None
    user_hash: str | None
    created_at: datetime
    updated_at: datetime
    assigned_to: str | None = None
    simulated: bool = False
    history: list[CaseEvent] = field(default_factory=list)

    @property
    def is_open(self) -> bool:
        return self.state not in CLOSED

    @property
    def was_recovered(self) -> bool:
        return any(e.to_state is S.RECUPERADA for e in self.history)

    @property
    def next_states(self) -> list[BikeState]:
        """Estados a los que una persona (Guardián u operador) puede mover el caso ahora."""
        return [to for to in TRANSITIONS[self.state] if _taller_rule_ok(self, to)]

    def log(self, now: datetime, to: BikeState, actor: Actor, note: str | None) -> None:
        self.history.append(CaseEvent(ts=now, from_state=self.state, to_state=to, actor=actor, note=note))
        self.state = to
        self.updated_at = now


def _taller_rule_ok(case: Case, to: BikeState) -> bool:
    # reincorporada solo cuenta bicis que de verdad se recuperaron; si no, vuelve a en_estacion.
    return case.state is not S.TALLER or (to is S.REINCORPORADA) == case.was_recovered


def check_transition(case: Case, to: BikeState, actor: Actor) -> None:
    if to not in TRANSITIONS[case.state]:
        raise InvalidTransition(f"No se puede pasar de {case.state} a {to}")
    if actor not in HUMANS and (case.state, to) not in AUTOMATIC:
        raise InvalidTransition(f"De {case.state} a {to} lo decide un Guardián o el operador")
    if not _taller_rule_ok(case, to):
        expected = S.REINCORPORADA if case.was_recovered else S.EN_ESTACION
        raise InvalidTransition(f"Desde taller esta bici pasa a {expected}")


class CaseStore:
    """En memoria para el P0; Supabase en P1."""

    def __init__(self) -> None:
        self._cases: dict[str, Case] = {}

    def _open_duplicate(self, incident: IncidentIn) -> Case | None:
        for case in self._cases.values():
            if not case.is_open or case.simulated:
                continue
            if incident.bike_id and case.bike_id == incident.bike_id:
                return case
            if incident.return_id and case.return_id == incident.return_id:
                return case
        return None

    def open(self, incident: IncidentIn, now: datetime, simulated: bool = False) -> tuple[Case, bool]:
        """Abre un caso, o suma el reporte al caso abierto de la misma bici o verificación.
        `simulated` solo lo usan los escenarios de scenarios.py; nunca llega desde la API."""
        if dup := self._open_duplicate(incident):
            dup.log(now, dup.state, incident.source, incident.note or f"Reporte adicional: {incident.type}")
            return dup, False
        state = INITIAL_STATE[incident.type]
        case = Case(
            case_id=f"caso_{uuid4().hex[:10]}",
            type=incident.type,
            source=incident.source,
            state=state,
            station_id=incident.station_id,
            bike_id=incident.bike_id,
            return_id=incident.return_id,
            user_hash=incident.user_hash,
            simulated=simulated,
            created_at=now,
            updated_at=now,
        )
        case.history.append(CaseEvent(ts=now, from_state=None, to_state=state,
                                      actor=incident.source, note=incident.note))
        self._cases[case.case_id] = case
        return case, True

    def get(self, case_id: str) -> Case:
        try:
            return self._cases[case_id]
        except KeyError:
            raise CaseNotFound(case_id) from None

    def list(self, state: BikeState | None = None, station_id: str | None = None,
             open_only: bool | None = None) -> list[Case]:
        cases = [
            c for c in self._cases.values()
            if (state is None or c.state is state)
            and (station_id is None or c.station_id == station_id)
            and (open_only is None or c.is_open == open_only)
        ]
        return sorted(cases, key=lambda c: c.created_at)

    def transition(self, case_id: str, to: BikeState, actor: Actor, now: datetime,
                   note: str | None = None, station_id: str | None = None) -> Case:
        case = self.get(case_id)
        check_transition(case, to, actor)
        if station_id is not None:
            case.station_id = station_id
        case.log(now, to, actor, note)
        return case

    def assign(self, case_id: str, guardian_id: str, actor: Actor, now: datetime) -> Case:
        case = self.get(case_id)
        if not case.is_open:
            raise InvalidTransition("El caso ya está cerrado")
        if actor not in HUMANS:
            raise InvalidTransition("La asignación la hace un Guardián o el operador")
        case.assigned_to = guardian_id
        case.log(now, case.state, actor, f"Asignado a {guardian_id}")
        return case

    def counts(self, now: datetime) -> CasesCountResponse:
        """Contrato C5 para la Línea 1."""
        by_station: dict[str, list[int]] = defaultdict(lambda: [0, 0])
        for case in self._cases.values():
            if case.station_id is None or case.simulated:  # lo SIMULADO no entra al contrato
                continue
            if case.is_open:
                by_station[case.station_id][0] += 1
            elif case.state is S.REINCORPORADA:
                by_station[case.station_id][1] += 1
        return CasesCountResponse(
            generated_at=now,
            stations=[CasesCount(station_id=sid, open_cases=o, reincorporated=r)
                      for sid, (o, r) in sorted(by_station.items())],
        )
