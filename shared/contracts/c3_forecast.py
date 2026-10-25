"""C3 · forecast (dueño: Línea 3). Probabilidad de bici útil y de anclaje libre al llegar.

Lo sirven GET /api/v1/viaje/stations/{id}/forecast y GET /api/v1/viaje/forecast.
Reglas del día: campos nuevos solo opcionales; nunca renombrar ni quitar.
"""

from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    station_id: str = Field(description="Número de la estación (el del letrero), p. ej. '271'")
    ts: str = Field(description="Momento del pronóstico, ISO 8601 en UTC")
    horizon_min: int = Field(ge=1, le=180, description="Minutos desde ts")
    p_useful_bike: float = Field(ge=0, le=1, description="P(al menos 1 bici útil) en ts + horizon_min")
    p_free_dock: float = Field(ge=0, le=1, description="P(al menos 1 anclaje libre) en ts + horizon_min")


class ForecastResponse(BaseModel):
    mode: str = Field(description="REAL, EJEMPLO o VIVO…: de dónde salen los datos")
    forecast: list[ForecastPoint]
