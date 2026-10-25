"""C6 · Riesgo de pérdida por estación y franja. Dueña: Línea 2. Es riesgo, no robo comprobado."""

from pydantic import BaseModel, Field


class LossRisk(BaseModel):
    station_id: str
    time_band: str = Field(description="Franja en hora CDMX, p. ej. '18:00-21:00'")
    disappeared_bikes: int = Field(ge=0, description="Bicis con último arribo aquí y sin salida en 3+ semanas")
    note: str = "riesgo, no robo comprobado"
    short_name: str | None = Field(default=None, description="Código CE del CSV (p. ej. 271-272); station_id es el del feed")
