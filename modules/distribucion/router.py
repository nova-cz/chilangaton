"""Línea 4 · Distribución (Miguel). Endpoints de S3/S5 se agregan aquí.

Planeado (aún no implementado): GET /simulation/results?scenario=10, y en P1 GET /missions,
POST /missions/{id}/accept. Ver docs/frontend-roadmap.md.
"""

from fastapi import APIRouter

router = APIRouter(tags=["distribucion"])
