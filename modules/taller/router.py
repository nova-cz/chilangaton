"""Línea 2 · Taller. Se monta solo bajo /api/v1 (services/api/core/modules.py)."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from shared.contracts.c2_priority import Priority
from shared.contracts.c4_reports import Report, ReportIn
from shared.contracts.c6_loss_risk import LossRisk

from . import engine

router = APIRouter(prefix="/taller", tags=["Línea 2 · Taller"])
DATA = engine.load()


@router.get("/priority", response_model=dict)
def priority(at: str | None = None, limit: int = 50):
    """D3 · Estaciones para el taller, de mayor a menor prioridad (C2). `at` en hora CDMX."""
    when = datetime.fromisoformat(at) if at else None
    items = [Priority(**p).model_dump() for p in engine.priority(DATA, when)][:limit]
    pending = [] if DATA.mode == "EJEMPLO" else ["empty_share: falta el feed de la Línea 1"]
    return {"mode": DATA.mode, "pending": pending, "items": items}


@router.get("/ignored", response_model=dict)
def ignored(at: str | None = None):
    """D2 · Bicis ignoradas en `at` (hora CDMX, p. ej. 2026-09-22T08:00). Sin `at`: último dato."""
    when = datetime.fromisoformat(at) if at else None
    items = engine.ignored_bikes(DATA, when)
    summary = {"bici ignorada": 0, "sin movimiento 3+ días": 0}
    for i in items:
        summary[i["signal"]] += 1
    return {"mode": DATA.mode, "summary": summary, "items": items}


@router.get("/loss-risk", response_model=dict)
def loss_risk(at: str | None = None, limit: int = 50):
    """D4 · Estaciones y franjas donde más bicis dejan de aparecer (C6). Riesgo, no robo comprobado."""
    when = datetime.fromisoformat(at) if at else None
    items = [LossRisk(**r).model_dump() for r in engine.loss_risk(DATA, when)]
    total = sum(i["disappeared_bikes"] for i in items)
    return {"mode": DATA.mode, "total_bikes": total, "items": items[:limit]}


@router.get("/reports", response_model=dict)
def list_reports():
    return {"mode": DATA.mode, "items": DATA.reports}


@router.post("/reports", response_model=Report, status_code=201)
def create_report(body: ReportIn):
    report = Report(
        **body.model_dump(),
        report_id=f"r-{uuid.uuid4().hex[:8]}",
        created_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    DATA.reports.append(report.model_dump())
    return report
