"""R2 · "Anclé aquí": compara la estación antes y después de anclar y responde uno de tres estados honestos.

Nunca dice "viaje cerrado": eso solo lo confirma la app oficial. Que el conteo suba puede ser otra
persona y que no suba puede ser retraso del feed, por eso los mensajes hablan de la estación, no de la bici.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import uuid4

from .gbfs import FeedProblem, StationReading
from .schemas import ClientBaseline, ReturnOut, ReturnStatus, StationSnapshot

WINDOW = timedelta(minutes=3)
CLIENT_BASELINE_MAX_AGE = timedelta(minutes=15)
CLOCK_SKEW = timedelta(minutes=1)

MESSAGES = {
    ReturnStatus.REVISANDO: "Revisando la estación…",
    ReturnStatus.VEMOS_UNA_MAS: "Vemos una bici más en la estación",
    ReturnStatus.SIN_CAMBIO: "Aún no vemos cambio: revisa la luz verde y vuelve a empujar",
    ReturnStatus.NO_RESPONDE: "La estación no responde",
}


@dataclass
class ReturnCheck:
    return_id: str
    station_id: str
    created_at: datetime
    checked_at: datetime
    baseline: StationSnapshot | None
    latest: StationSnapshot | None = None
    status: ReturnStatus = ReturnStatus.REVISANDO

    def out(self) -> ReturnOut:
        return ReturnOut(
            return_id=self.return_id,
            station_id=self.station_id,
            status=self.status,
            message=MESSAGES[self.status],
            created_at=self.created_at,
            checked_at=self.checked_at,
            window_ends_at=self.created_at + WINDOW,
            baseline=self.baseline,
            latest=self.latest,
        )


def snapshot(reading: StationReading) -> StationSnapshot:
    return StationSnapshot(
        bikes_available=reading.bikes_available,
        bikes_disabled=reading.bikes_disabled,
        docks_available=reading.docks_available,
        observed_at=reading.feed_updated,
        source="feed",
    )


def _usable(baseline: ClientBaseline | None, now: datetime) -> bool:
    return baseline is not None and -CLOCK_SKEW <= now - baseline.observed_at <= CLIENT_BASELINE_MAX_AGE


def start(station_id: str, reading: StationReading | FeedProblem,
          client_baseline: ClientBaseline | None, now: datetime) -> ReturnCheck:
    """Abre una verificación. Si la app manda lo que veía al llegar, se compara contra eso:
    el feed puede haber sumado la bici antes de que la persona tocara el botón."""
    if _usable(client_baseline, now):
        baseline = StationSnapshot(
            bikes_available=client_baseline.bikes_available,
            bikes_disabled=client_baseline.bikes_disabled,
            observed_at=client_baseline.observed_at,
            source="app",
        )
    elif isinstance(reading, StationReading):
        baseline = snapshot(reading)
    else:
        baseline = None
    check = ReturnCheck(return_id=f"anc_{uuid4().hex[:10]}", station_id=station_id,
                        created_at=now, checked_at=now, baseline=baseline)
    return evaluate(check, reading, now)


def evaluate(check: ReturnCheck, reading: StationReading | FeedProblem, now: datetime) -> ReturnCheck:
    """Avanza la verificación con una lectura nueva. Los tres estados finales no cambian después."""
    if check.status is not ReturnStatus.REVISANDO:
        return check
    check.checked_at = now
    window_over = now - check.created_at >= WINDOW

    if isinstance(reading, FeedProblem):
        # Un hueco del feed puede ser pasajero; solo se da por perdido al cerrar la ventana.
        if window_over:
            check.status = ReturnStatus.NO_RESPONDE
        return check

    check.latest = snapshot(reading)
    if not (reading.is_installed and reading.is_returning):
        check.status = ReturnStatus.NO_RESPONDE
        return check
    if check.baseline is None:
        # El feed no respondió al anclar: solo se puede comparar desde ahora.
        check.baseline = check.latest
    if check.latest.bikes_total > check.baseline.bikes_total:
        check.status = ReturnStatus.VEMOS_UNA_MAS
    elif window_over:
        check.status = ReturnStatus.SIN_CAMBIO
    return check
