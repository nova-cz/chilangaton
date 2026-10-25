"""Línea 4 · Distribución (Miguel).

GET /api/v1/contraflujo                          -> resultado de S2 (fixtures/contraflujo.json)
GET /api/v1/simulation/results?scenario=&recovered= -> resultados de S3 (fixtures/simulation_results.json), SIMULADO

Solo lee los JSON generados offline (engine.py / contraflujo.py): sin pandas ni duckdb en runtime.
Pendiente (P1): GET /missions, POST /missions/{id}/accept. Ver docs/frontend-roadmap.md.
"""

import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["distribucion"])
FIXTURES = Path(__file__).parent / "fixtures"
SCENARIOS = (0, 5, 10, 20)


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
    scenario: int | None = Query(None, description="Adopción en %; sin valor devuelve los cuatro escenarios."),
    recovered: bool = Query(False, description="Bicis deshabilitadas vuelven a servicio a las 7:00."),
) -> dict:
    if scenario is not None and scenario not in SCENARIOS:
        raise HTTPException(status_code=422, detail=f"scenario debe ser uno de {list(SCENARIOS)}")
    data = _load("simulation_results.json")
    group = data["scenarios"][str(recovered).lower()]
    meta = {k: v for k, v in data.items() if k != "scenarios"}
    scenarios = group if scenario is None else {str(scenario): group[str(scenario)]}
    return {**meta, "recovered": recovered, "scenarios": scenarios}
