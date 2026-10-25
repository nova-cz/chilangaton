"""Lectura del feed GBFS en vivo de Ecobici (station_status)."""

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum

import httpx

STATUS_URL = "https://gbfs.mex.lyftbikes.com/gbfs/es/station_status.json"
# El feed se publica con ttl de 10 s; si last_updated tiene más de 5 min, el feed no responde.
# Ojo: last_reported de cada estación solo cambia cuando cambia la estación, no sirve como latido.
STALE_AFTER_S = 300


class FeedProblem(StrEnum):
    CAIDO = "feed_caido"
    VIEJO = "feed_viejo"
    SIN_ESTACION = "estacion_no_existe"


@dataclass(frozen=True)
class StationReading:
    station_id: str
    bikes_available: int
    bikes_disabled: int
    docks_available: int
    is_installed: bool
    is_returning: bool
    last_reported: datetime
    feed_updated: datetime


def _ts(epoch: int) -> datetime:
    return datetime.fromtimestamp(epoch, UTC)


class StationFeed:
    """Guarda station_status durante su ttl para no pedir el feed en cada consulta."""

    def __init__(self, url: str = STATUS_URL):
        self.url = url
        self._stations: dict[str, dict] | None = None
        self._updated: datetime | None = None
        self._expires = 0.0

    async def _refresh(self) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(self.url)
            resp.raise_for_status()
            body = resp.json()
        self._stations = {s["station_id"]: s for s in body["data"]["stations"]}
        self._updated = _ts(body["last_updated"])
        self._expires = time.monotonic() + max(int(body.get("ttl", 10)), 5)

    async def station(self, station_id: str, now: datetime) -> StationReading | FeedProblem:
        if time.monotonic() >= self._expires:
            try:
                await self._refresh()
            except (httpx.HTTPError, ValueError, KeyError, TypeError):
                pass  # se queda con la última copia; abajo se revisa si ya es vieja
        if self._stations is None or self._updated is None:
            return FeedProblem.CAIDO
        if (now - self._updated).total_seconds() > STALE_AFTER_S:
            return FeedProblem.VIEJO
        raw = self._stations.get(station_id)
        if raw is None:
            return FeedProblem.SIN_ESTACION
        return StationReading(
            station_id=station_id,
            bikes_available=int(raw.get("num_bikes_available", 0)),
            bikes_disabled=int(raw.get("num_bikes_disabled", 0)),
            docks_available=int(raw.get("num_docks_available", 0)),
            is_installed=bool(raw.get("is_installed", 1)),
            is_returning=bool(raw.get("is_returning", 1)),
            last_reported=_ts(int(raw.get("last_reported", 0))),
            feed_updated=self._updated,
        )
