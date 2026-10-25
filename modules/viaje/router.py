"""Línea 3 · endpoints. El esqueleto de Miguel lo carga con app.include_router(router, prefix="/api/v1")."""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from shared.contracts.c3_forecast import ForecastResponse

from . import engine

router = APIRouter(prefix="/viaje", tags=["Línea 3 · Viaje"])
SOURCE = engine.Source()


def _now(at: str | None, data: engine.Data) -> datetime:
    """`at` permite fijar la hora de la demo, p. ej. 2026-09-29T07:45 (hora CDMX)."""
    if at:
        dt = datetime.fromisoformat(at)
        return dt if dt.tzinfo else dt.replace(tzinfo=engine.CDMX)
    if data.mode == "REAL":  # estado de real/ es del 29 sep: usar la hora de ahorita lo mezclaría
        return engine.REPLAY_AT
    return datetime.now(ZoneInfo("UTC"))


def _check(data: engine.Data, *ids):
    for i in ids:
        if i not in data.stations:
            raise HTTPException(404, f"Estación {i} no existe")


@router.get("/stations")
def stations(at: str | None = None):
    """Catálogo + estado actual (C1) para elegir origen y destino."""
    d = SOURCE.get()
    return {"mode": d.mode, "stations": engine.station_rows(d)}


@router.get("/nearby")
def nearby(lat: float, lon: float, at: str | None = None, limit: int = 5):
    d = SOURCE.get()
    return {"mode": d.mode, "stations": engine.nearby(d, lat, lon, _now(at, d), limit)}


@router.get("/stations/{station_id}/forecast")
def forecast(station_id: str, at: str | None = None,
             horizons: str = Query("15,30,60", pattern=r"^\d{1,3}(,\d{1,3}){0,11}$")):
    """C3. `horizons` opcional (p. ej. 15,30,45,60,75,90) para la curva de la pantalla de estación."""
    d = SOURCE.get()
    _check(d, station_id)
    hs = tuple(sorted({max(1, min(180, int(h))) for h in horizons.split(",")}))
    return {"mode": d.mode, "station": engine.station_row(d, station_id),
            "forecast": engine.forecast(d, station_id, _now(at, d), hs)}


@router.get("/forecast", response_model=ForecastResponse)
def forecast_many(station_ids: str | None = Query(None, description="Ids separados por coma; vacío = todas"),
                  at: str | None = None,
                  horizons: str = Query("15,30,60", pattern=r"^\d{1,3}(,\d{1,3}){0,11}$")):
    """C3 para varias estaciones (simulador de Línea 4, panel de Línea 1)."""
    d = SOURCE.get()
    ids = [i.strip() for i in station_ids.split(",") if i.strip()] if station_ids else sorted(d.states)
    _check(d, *ids)
    hs = tuple(sorted({max(1, min(180, int(h))) for h in horizons.split(",")}))
    now = _now(at, d)
    return {"mode": d.mode, "forecast": [p for i in ids for p in engine.forecast(d, i, now, hs)]}


@router.get("/recommendations")
def recommendations(origin: str, destination: str, at: str | None = None,
                    walk_to_origin: float = 3,
                    max_walk: float = Query(5, ge=1, le=15),
                    accept_alt: bool = True, avoid_effort: bool = False):
    d = SOURCE.get()
    _check(d, origin, destination)
    return engine.recommend(d, origin, destination, _now(at, d), walk_to_origin,
                            max_walk, accept_alt, avoid_effort)
