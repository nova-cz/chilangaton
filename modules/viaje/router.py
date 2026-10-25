"""Línea 3 · endpoints. El esqueleto de Miguel lo carga con app.include_router(router, prefix="/api/v1")."""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from . import engine

router = APIRouter(prefix="/viaje", tags=["Línea 3 · Viaje"])
DATA = engine.load()


def _now(at: str | None) -> datetime:
    """`at` permite fijar la hora de la demo, p. ej. 2026-09-29T07:45 (hora CDMX)."""
    if at:
        dt = datetime.fromisoformat(at)
        return dt if dt.tzinfo else dt.replace(tzinfo=engine.CDMX)
    return datetime.now(ZoneInfo("UTC"))


def _check(*ids):
    for i in ids:
        if i not in DATA.stations:
            raise HTTPException(404, f"Estación {i} no existe")


@router.get("/nearby")
def nearby(lat: float, lon: float, at: str | None = None, limit: int = 5):
    return {"mode": DATA.mode, "stations": engine.nearby(DATA, lat, lon, _now(at), limit)}


@router.get("/stations/{station_id}/forecast")
def forecast(station_id: str, at: str | None = None):
    _check(station_id)
    return {"mode": DATA.mode, "forecast": engine.forecast(DATA, station_id, _now(at))}


@router.get("/recommendations")
def recommendations(origin: str, destination: str, at: str | None = None,
                    walk_to_origin: float = 3,
                    max_walk: float = Query(5, ge=1, le=15),
                    accept_alt: bool = True, avoid_effort: bool = False):
    _check(origin, destination)
    return engine.recommend(DATA, origin, destination, _now(at), walk_to_origin,
                            max_walk, accept_alt, avoid_effort)
