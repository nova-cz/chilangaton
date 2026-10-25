"""Línea 4 · Distribución (Miguel).

GET /api/v1/contraflujo                          -> resultado de S2 (fixtures/contraflujo.json)
GET /api/v1/simulation/results?scenario=&recovered= -> resultados de S3 (fixtures/simulation_results.json), SIMULADO

Solo lee los JSON generados offline (engine.py / contraflujo.py): sin pandas ni duckdb en runtime.
S5 DEMO: GET /missions, POST /missions/{id}/accept y /complete; estado en memoria.
"""

import json
from enum import IntEnum
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from .missions import MissionStore

router = APIRouter(tags=["distribucion"])
FIXTURES = Path(__file__).parent / "fixtures"

class Scenario(IntEnum):
    baseline = 0
    low = 5
    medium = 10
    high = 20


@lru_cache(maxsize=4)
def _load(name: str) -> dict:
    path = FIXTURES / name
    if not path.exists():
        raise HTTPException(status_code=503, detail=f"{name} no se ha generado todavía (ver modules/distribucion).")
    return json.loads(path.read_text())


@router.get("/contraflujo")
def contraflujo() -> dict:
    return _load("contraflujo.json")


@router.get("/simulation/results")
def simulation_results(
    scenario: Scenario | None = Query(None, description="Adopción en %; sin valor devuelve los cuatro escenarios."),
    recovered: bool = Query(False, description="Bicis deshabilitadas vuelven a servicio a las 7:00."),
) -> dict:
    data = _load("simulation_results.json")
    group = data["scenarios"][str(recovered).lower()]
    meta = {k: v for k, v in data.items() if k != "scenarios"}
    scenarios = group if scenario is None else {str(scenario): group[str(scenario)]}
    return {**meta, "recovered": recovered, "scenarios": scenarios}


UserHash = Annotated[str, Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")]
Token = Annotated[str, Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")]


class AcceptMission(BaseModel):
    user_hash: UserHash
    bike_id: Token
    request_id: Token


class CompleteMission(BaseModel):
    user_hash: UserHash
    acceptance_id: Token
    request_id: Token
    station_ids: list[Token] = Field(min_length=2, max_length=20)


@lru_cache(maxsize=1)
def mission_store() -> MissionStore:
    return MissionStore.demo()


def require_demo(request: Request) -> None:
    settings = getattr(request.app.state, "settings", None)
    if settings is not None and not settings.demo_mode:
        raise HTTPException(404, "Misiones disponibles solo en modo DEMO")


@router.get("/missions", dependencies=[Depends(require_demo)])
def missions(user_hash: UserHash, store: Annotated[MissionStore, Depends(mission_store)]) -> dict:
    return store.listing(user_hash)


@router.post("/missions/{mission_id}/accept", dependencies=[Depends(require_demo)])
def accept_mission(mission_id: str, body: AcceptMission, store: Annotated[MissionStore, Depends(mission_store)]) -> dict:
    return store.accept(mission_id, body.user_hash, body.bike_id, body.request_id)


@router.post("/missions/{mission_id}/complete", dependencies=[Depends(require_demo)])
def complete_mission(mission_id: str, body: CompleteMission, store: Annotated[MissionStore, Depends(mission_store)]) -> dict:
    return store.complete(mission_id, body.user_hash, body.acceptance_id, body.station_ids, body.request_id)
