"""Línea 1 · endpoints. El esqueleto de Miguel lo carga con app.include_router(router, prefix="/api/v1")."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from . import engine

router = APIRouter(prefix="/bici-util", tags=["Línea 1 · Bici Útil"])
DATA = engine.load()


def _at(at: str | None) -> datetime | None:
    """`at` fija la hora de la demo, p. ej. 2026-09-29T08:00 (hora CDMX). Sin `at`, la última foto."""
    if not at:
        return None
    dt = datetime.fromisoformat(at)
    return dt if dt.tzinfo else dt.replace(tzinfo=engine.CDMX)


@router.get("/stations")
def stations(at: str | None = None):
    """Contrato C1: bici útil por estación."""
    return {"mode": DATA.mode, "c2_mode": DATA.c2_mode, "stations": engine.stations(DATA, _at(at))}


@router.get("/stations/{station_id}")
def station(station_id: str, at: str | None = None):
    row = next((s for s in engine.stations(DATA, _at(at)) if s["station_id"] == station_id), None)
    if row is None:
        raise HTTPException(404, f"Estación {station_id} no existe")
    return {"mode": DATA.mode, "c2_mode": DATA.c2_mode, "station": row}


@router.get("/hourly")
def hourly():
    """Perfil del sistema por hora CDMX (días hábiles): para la gráfica del panel."""
    return {"mode": DATA.mode, "hours": engine.hourly(DATA)}


@router.get("/clock")
def clock(at: str | None = None, limit_h: float = engine.CLOCK_LIMIT_H):
    """Reloj de 36 h: estaciones fuera de plazo con horas acumuladas."""
    return {"mode": DATA.mode, **engine.clock(DATA, _at(at), limit_h)}


@router.get("/contract")
def contract(at: str | None = None):
    """Los tres indicadores del contrato."""
    return engine.contract(DATA, _at(at))
