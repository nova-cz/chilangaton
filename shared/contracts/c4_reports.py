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
