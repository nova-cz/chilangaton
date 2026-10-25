"""C5 · cases_count — Línea 5 (Regreso Seguro) → Línea 1 (Bici Útil y supervisión).

Endpoint: GET /api/v1/cases/count. Tipo de TypeScript equivalente: shared/contracts/cases_count.ts

Solo aparecen estaciones con al menos un caso; las que no salen tienen 0 y 0.
Los casos sin estación conocida no se cuentan aquí (sí salen en GET /cases).
"""

from pydantic import AwareDatetime, BaseModel, Field


class CasesCount(BaseModel):
    station_id: str = Field(description='station_id del feed GBFS (no el código "CE-xxx")')
    open_cases: int = Field(ge=0, description="Casos abiertos cuya última estación conocida es esta")
    reincorporated: int = Field(ge=0, description="Casos que terminaron con la bici reincorporada en esta estación")


class CasesCountResponse(BaseModel):
    generated_at: AwareDatetime = Field(description="Hora del dato en UTC; se muestra en hora CDMX")
    stations: list[CasesCount]
