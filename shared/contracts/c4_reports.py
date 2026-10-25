"""C4 · Reportes de bicis dañadas. Dueña del esquema: Línea 2. Nunca acusa a una persona."""

from typing import Literal

from pydantic import BaseModel, Field

ReportType = Literal["llanta", "frenos", "cadena", "asiento", "anclaje", "otro"]
ReportSource = Literal["usuario", "taller", "deteccion"]


class ReportIn(BaseModel):
    station_id: str
    bike_id: str | None = None
    type: ReportType
    source: ReportSource = "usuario"
    user_hash: str | None = Field(default=None, description="Hash anónimo; nunca nombre ni teléfono")


class Report(ReportIn):
    report_id: str
    created_at: str = Field(description="ISO 8601 en UTC")
    # Opcionales (los llena la Línea 2; quien escribe no los manda)
    status: Literal["valido", "descartado"] = "valido"
    discard_reason: str | None = Field(default=None, description="Por qué se descartó, en texto")
    confidence: float | None = Field(default=None, ge=0, le=1, description="0 a 1; se calcula al leer, nunca es pública por persona")


class Withdrawal(BaseModel):
    """Aviso de que una persona retiró una bici. Lo manda quien lo sepa (la app de la Línea 3)."""
    bike_id: str
    user_hash: str = Field(description="Hash anónimo; el mismo que usó al reportar")
    taken_at: str | None = Field(default=None, description="ISO 8601 en UTC; si falta, ahora")
