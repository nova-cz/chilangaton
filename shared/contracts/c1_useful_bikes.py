"""C1 · useful_bikes. Dueño: Línea 1 (Bici Útil). Lo usan las Líneas 3 y 4.

Una fila por estación y foto del feed. `useful_bikes` ya descuenta las bicis sospechosas
(C2, Línea 2): NO se vuelve a restar `suspected_expected` del lado de quien lo consume.

    useful_bikes = max(0, round(bikes_available - suspected_expected))

`bikes_available` del feed ya excluye a las deshabilitadas, así que estas no se restan otra vez.
Estación cerrada (`is_renting = false`): se publica con `useful_bikes = 0` y sus bicis
deshabilitadas no cuentan en ningún indicador.
"""

from pydantic import BaseModel, Field


class UsefulBikes(BaseModel):
    station_id: str
    ts: str = Field(description="Hora de la foto del feed, ISO 8601 en UTC")
    bikes_available: int = Field(ge=0, description="num_bikes_available del feed")
    bikes_disabled: int = Field(ge=0, description="num_bikes_disabled del feed")
    useful_bikes: int = Field(ge=0, description="bikes_available − sospechosas esperadas (C2)")
    is_renting: bool
    pct_empty_hour: float = Field(
        ge=0, le=1,
        description="Fracción de fotos en esa misma hora CDMX (días hábiles de la ventana) "
                    "con bikes_available = 0")
    # Opcionales (los agrega quien los necesite; nunca se quitan en el día)
    is_returning: bool | None = None
    docks_available: int | None = None
    docks_disabled: int | None = None
    capacity: int | None = None
    suspected_expected: float | None = Field(None, description="Lo que se restó, tomado de C2")
    disabled_hours: float | None = Field(
        None, description="Horas seguidas con al menos una bici deshabilitada (reloj de 36 h)")
