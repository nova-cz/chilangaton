"""C2 · Prioridad de taller por estación. Dueña: Línea 2. Lo consume la Línea 3 (resta suspected_expected)."""

from pydantic import BaseModel, Field


class Priority(BaseModel):
    station_id: str
    ts: str = Field(description="ISO 8601 en UTC")
    suspected_expected: float = Field(ge=0, description="Bicis ancladas que probablemente no sirven")
    priority_score: float = Field(ge=0, description="sospechosas × salidas en pico × % del tiempo vacía")
    top_signals: list[str] = Field(default_factory=list)
    # Opcionales (para explicar el score; los consumidores pueden ignorarlos)
    peak_departures: float | None = Field(default=None, description="Salidas promedio por día hábil en pico")
    empty_share: float | None = Field(default=None, description="% del tiempo vacía en pico; None = pendiente feed L1")
    short_name: str | None = Field(default=None, description="Código CE del CSV (p. ej. 271-272); station_id es el del feed")
