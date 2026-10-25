"""Modelos de la Línea 5 · Regreso Seguro: casos (R4) y verificación de anclaje (R2)."""

from enum import StrEnum
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


# ---------- Casos ----------
class BikeState(StrEnum):
    """Dónde está la bici, nunca quién la tiene."""
    EN_ESTACION = "en_estacion"
    EN_VIAJE = "en_viaje"
    TRASLADO = "traslado"
    TALLER = "taller"
    DEVOLUCION_EN_DUDA = "devolucion_en_duda"
    EN_REVISION = "en_revision"
    LOCALIZADA = "localizada"
    RECUPERADA = "recuperada"
    REINCORPORADA = "reincorporada"


class IncidentType(StrEnum):
    ROBO = "robo"
    PERDIDA = "perdida"
    ANCLAJE = "anclaje"            # la persona ancló y el feed no lo muestra
    VIAJE_LARGO = "viaje_largo"    # nadie respondió el "¿Todo bien?" de los 90 min
    DISCREPANCIA = "discrepancia"  # regla automática, p. ej. bici que se mueve sin viaje


class Actor(StrEnum):
    APP = "app"
    SISTEMA = "sistema"
    GUARDIAN = "guardian"
    OPERADOR = "operador"


class IncidentIn(BaseModel):
    type: IncidentType
    source: Actor = Actor.APP
    station_id: str | None = Field(None, description="Última estación conocida (station_id del feed)")
    bike_id: str | None = Field(None, description="Matrícula, si la persona la tiene")
    user_hash: str | None = Field(None, description="Se guarda para el contrato C4; nunca se publica")
    return_id: str | None = Field(None, description="Verificación de anclaje que respalda el reporte")
    note: str | None = Field(None, max_length=280)


class CaseEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ts: AwareDatetime
    from_state: BikeState | None
    to_state: BikeState
    actor: Actor
    note: str | None = None


class CaseOut(BaseModel):
    """Vista pública del caso: sin user_hash y sin ubicación más precisa que la estación."""
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    type: IncidentType
    source: Actor
    state: BikeState
    is_open: bool
    station_id: str | None
    bike_id: str | None
    return_id: str | None
    assigned_to: str | None
    created_at: AwareDatetime
    updated_at: AwareDatetime
    history: list[CaseEvent]


class IncidentOut(BaseModel):
    case: CaseOut
    created: bool = Field(description="False si se sumó a un caso abierto de la misma bici o verificación")


class TransitionIn(BaseModel):
    to_state: BikeState
    actor: Actor
    note: str | None = Field(None, max_length=280)
    station_id: str | None = Field(None, description="Nueva última estación conocida, si cambió")


class AssignIn(BaseModel):
    guardian_id: str = Field(min_length=1)
    actor: Actor = Actor.OPERADOR


# ---------- "Anclé aquí" ----------
class ReturnStatus(StrEnum):
    REVISANDO = "revisando"
    VEMOS_UNA_MAS = "vemos_una_mas"
    SIN_CAMBIO = "sin_cambio"
    NO_RESPONDE = "no_responde"


class ClientBaseline(BaseModel):
    """Lo que la app mostraba de la estación al llegar, antes de anclar."""
    bikes_available: int = Field(ge=0)
    bikes_disabled: int = Field(0, ge=0)
    observed_at: AwareDatetime


class ReturnIn(BaseModel):
    station_id: str
    baseline: ClientBaseline | None = None


class StationSnapshot(BaseModel):
    bikes_available: int
    bikes_disabled: int
    docks_available: int | None = None
    observed_at: AwareDatetime
    source: Literal["feed", "app"]

    @property
    def bikes_total(self) -> int:
        return self.bikes_available + self.bikes_disabled


class ReturnOut(BaseModel):
    return_id: str
    station_id: str
    status: ReturnStatus
    message: str
    created_at: AwareDatetime
    checked_at: AwareDatetime
    window_ends_at: AwareDatetime
    baseline: StationSnapshot | None
    latest: StationSnapshot | None
