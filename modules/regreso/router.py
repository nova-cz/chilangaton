"""Línea 5 · Regreso Seguro. Se monta bajo /api/v1 desde services/api/main.py."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from shared.contracts.c5_cases_count import CasesCountResponse

from . import returns
from .cases import CaseNotFound, CaseStore, InvalidTransition
from .gbfs import FeedProblem, StationFeed
from .schemas import AssignIn, BikeState, CaseOut, IncidentIn, IncidentOut, ReturnIn, ReturnOut, TransitionIn

router = APIRouter(tags=["Línea 5 · Regreso Seguro"])

_feed = StationFeed()
_cases = CaseStore()
_returns: dict[str, returns.ReturnCheck] = {}


# Dependencias separadas para que las pruebas puedan cambiarlas.
def get_feed() -> StationFeed:
    return _feed


def get_cases() -> CaseStore:
    return _cases


def get_returns() -> dict[str, returns.ReturnCheck]:
    return _returns


def now_utc() -> datetime:
    return datetime.now(UTC)


# ---------- R2 · "Anclé aquí" ----------
@router.post("/returns", response_model=ReturnOut, status_code=status.HTTP_201_CREATED)
async def create_return(body: ReturnIn, feed=Depends(get_feed), store=Depends(get_returns),
                        now: datetime = Depends(now_utc)):
    """Abre una verificación de 3 min. La app consulta GET /returns/{id} hasta que el estado
    deje de ser "revisando"."""
    reading = await feed.station(body.station_id, now)
    if reading is FeedProblem.SIN_ESTACION:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Estación no encontrada en el feed")
    check = returns.start(body.station_id, reading, body.baseline, now)
    store[check.return_id] = check
    return check.out()


@router.get("/returns/{return_id}", response_model=ReturnOut)
async def get_return(return_id: str, feed=Depends(get_feed), store=Depends(get_returns),
                     now: datetime = Depends(now_utc)):
    check = store.get(return_id)
    if check is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Verificación no encontrada")
    if check.status is returns.ReturnStatus.REVISANDO:
        returns.evaluate(check, await feed.station(check.station_id, now), now)
    return check.out()


# ---------- R4 · Casos ----------
@router.post("/incidents", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
def create_incident(body: IncidentIn, response: Response, store: CaseStore = Depends(get_cases),
                    now: datetime = Depends(now_utc)):
    case, created = store.open(body, now)
    if not created:
        response.status_code = status.HTTP_200_OK
    return IncidentOut(case=CaseOut.model_validate(case), created=created)


@router.get("/cases", response_model=list[CaseOut])
def list_cases(state: BikeState | None = None, station_id: str | None = None,
               open_only: bool | None = Query(None, alias="open"),
               store: CaseStore = Depends(get_cases)):
    return [CaseOut.model_validate(c) for c in store.list(state, station_id, open_only)]


# Va antes de /cases/{case_id} para que "count" no se lea como id.
@router.get("/cases/count", response_model=CasesCountResponse)
def cases_count(store: CaseStore = Depends(get_cases), now: datetime = Depends(now_utc)):
    """Contrato C5 para la Línea 1."""
    return store.counts(now)


@router.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: str, store: CaseStore = Depends(get_cases)):
    try:
        return CaseOut.model_validate(store.get(case_id))
    except CaseNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Caso no encontrado") from None


@router.post("/cases/{case_id}/transitions", response_model=CaseOut)
def transition_case(case_id: str, body: TransitionIn, store: CaseStore = Depends(get_cases),
                    now: datetime = Depends(now_utc)):
    try:
        case = store.transition(case_id, body.to_state, body.actor, now, body.note, body.station_id)
    except CaseNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Caso no encontrado") from None
    except InvalidTransition as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from None
    return CaseOut.model_validate(case)


@router.post("/cases/{case_id}/assign", response_model=CaseOut)
def assign_case(case_id: str, body: AssignIn, store: CaseStore = Depends(get_cases),
                now: datetime = Depends(now_utc)):
    try:
        case = store.assign(case_id, body.guardian_id, body.actor, now)
    except CaseNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Caso no encontrado") from None
    except InvalidTransition as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from None
    return CaseOut.model_validate(case)
