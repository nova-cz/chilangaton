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
def priority():
    items = [Priority(**p).model_dump() for p in engine.priority(DATA)]
    return {"mode": DATA.mode, "items": items}


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
def loss_risk():
    items = [LossRisk(**r).model_dump() for r in engine.loss_risk(DATA)]
    return {"mode": DATA.mode, "items": items}


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
