"""Endpoints DEMO: leen fixtures inventados. NO son contratos oficiales entre líneas."""

import json
from functools import lru_cache

from fastapi import APIRouter, HTTPException

from services.api.core.config import REPO_ROOT

FIXTURE = REPO_ROOT / "shared" / "fixtures" / "demo-stations.json"

router = APIRouter(prefix="/demo", tags=["demo (no oficial)"])


@lru_cache
def _load() -> dict[str, object]:
    try:
        return json.loads(FIXTURE.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Fixture DEMO no disponible") from exc


@router.get(
    "/stations",
    summary="Estaciones DEMO (datos inventados)",
    description="Fixture para maquetar la app. No son datos de ECOBICI ni un contrato entre líneas.",
)
def demo_stations() -> dict[str, object]:
    data = _load()
    return {"label": "DEMO", "meta": data["_meta"], "stations": data["stations"]}
