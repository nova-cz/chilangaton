"""C2 · Prioridad de taller por estación. Dueña: Línea 2. Lo consume la Línea 3 (resta suspected_expected)."""

from pydantic import BaseModel, Field


class Priority(BaseModel):
    station_id: str
    ts: str = Field(description="ISO 8601 en UTC")
    suspected_expected: float = Field(ge=0, description="Bicis ancladas que probablemente no sirven")
    priority_score: float = Field(ge=0, description="sospechosas × salidas en pico × % del tiempo vacía")
    top_signals: list[str] = Field(default_factory=list)
