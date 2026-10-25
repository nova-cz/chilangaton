"""Ids de estación entre líneas. Contrato de ids: ver station_ids.md.

    station_key("CE-014 Reforma")  -> "14"
    station_key("271-272")         -> "271-272"
    ce_to_feed("271-272")          -> "141"       (station_id del feed GBFS)
    feed_to_ce("141")              -> "271-272"
"""

import json
import re
from functools import lru_cache
from pathlib import Path

MAP_FILE = Path(__file__).resolve().parent / "stations_map.json"

_CODE = re.compile(r"\s*(?:CE-?)?\s*(\d+(?:-\d+)*)", re.IGNORECASE)


def station_key(raw: object) -> str | None:
    """Código CE normalizado: sin ceros a la izquierda y con las partes unidas por '-'.

    Acepta el código solo ('014', '271-272', 271.0) o el nombre del feed ('CE-271-272 Jesús García…').
    Da el mismo resultado que station_key() de las Líneas 1 y 3 y de prepare_data.py.
    """
    if raw is None:
        return None
    m = _CODE.match(re.sub(r"\.0$", "", str(raw).strip()))
    if not m:
        return None
    return "-".join(p.lstrip("0") or "0" for p in m.group(1).split("-"))


@lru_cache(maxsize=1)
def ce_to_feed_map() -> dict[str, str]:
    """Código CE -> station_id del feed, para las 677 estaciones de septiembre 2026."""
    return json.loads(MAP_FILE.read_text(encoding="utf-8")) if MAP_FILE.exists() else {}


def ce_to_feed(code: object, default: str | None = None) -> str | None:
    key = station_key(code)
    return ce_to_feed_map().get(key, default) if key else default


@lru_cache(maxsize=1)
def _feed_to_ce_map() -> dict[str, str]:
    return {v: k for k, v in ce_to_feed_map().items()}


def feed_to_ce(feed_id: object, default: str | None = None) -> str | None:
    return _feed_to_ce_map().get(str(feed_id), default)
