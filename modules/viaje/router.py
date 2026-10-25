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


@router.get("/stations")
def stations(at: str | None = None):
    """Catálogo + estado actual (C1) para elegir origen y destino."""
    return {"mode": DATA.mode, "stations": engine.station_rows(DATA)}


@router.get("/nearby")
def nearby(lat: float, lon: float, at: str | None = None, limit: int = 5):
    return {"mode": DATA.mode, "stations": engine.nearby(DATA, lat, lon, _now(at), limit)}


@router.get("/stations/{station_id}/forecast")
def forecast(station_id: str, at: str | None = None,
             horizons: str = Query("15,30,60", pattern=r"^\d{1,3}(,\d{1,3}){0,11}$")):
    """C3. `horizons` opcional (p. ej. 15,30,45,60,75,90) para la curva de la pantalla de estación."""
    _check(station_id)
    hs = tuple(sorted({max(1, min(180, int(h))) for h in horizons.split(",")}))
    return {"mode": DATA.mode, "station": engine.station_row(DATA, station_id),
            "forecast": engine.forecast(DATA, station_id, _now(at), hs)}


@router.get("/recommendations")
def recommendations(origin: str, destination: str, at: str | None = None,
                    walk_to_origin: float = 3,
                    max_walk: float = Query(5, ge=1, le=15),
                    accept_alt: bool = True, avoid_effort: bool = False):
    _check(origin, destination)
    return engine.recommend(DATA, origin, destination, _now(at), walk_to_origin,
                            max_walk, accept_alt, avoid_effort)
