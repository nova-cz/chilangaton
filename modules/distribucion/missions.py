"""S5 DEMO: misiones en memoria. No verifica viajes, desbloqueos ni canjes de ECOBICI.

Una aceptación simula el desbloqueo y congela la recompensa. Una entrega recibe un
recorrido DEMO; un circuito A->B->A, incluso en dos misiones con la misma bici y
persona, deja cero puntos netos. El ledger y la idempotencia duran un proceso.
"""

from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from threading import RLock
from uuid import uuid4

from fastapi import HTTPException

FIXTURES = Path(__file__).resolve().parents[2] / "shared" / "fixtures"


class MissionStore:
    def __init__(self, missions: list[dict], stations: list[dict], *, new_stations: set[str] | None = None):
        self.missions = {m["id"]: deepcopy(m) for m in missions}
        self.stations = {s["id"]: deepcopy(s) for s in stations}
        self.new_stations = new_stations or set()
        self.zone_weights = {"Buenavista": Decimal("1.25"), "San Rafael": Decimal("1.15")}
        self.acceptances: dict[str, dict] = {}
        self.requests: dict[tuple[str, str], tuple[tuple, str]] = {}
        self.ledger: list[dict] = []
        self._lock = RLock()

    @classmethod
    def demo(cls) -> MissionStore:
        missions = json.loads((FIXTURES / "demo-missions.json").read_text())["missions"]
        stations = json.loads((FIXTURES / "demo-stations.json").read_text())["stations"]
        # Supuesto DEMO: demo-02 se trata como estación nueva. No describe una estación real.
        return cls(missions, stations, new_stations={"demo-02"})

    def _mission(self, mission_id: str) -> dict:
        if mission_id not in self.missions:
            raise HTTPException(404, "Misión no encontrada")
        return self.missions[mission_id]

    def _eligible(self, mission: dict) -> bool:
        origin = self.stations.get(mission["from_station_id"], {})
        dest = self.stations.get(mission["to_station_id"], {})
        return bool(
            origin.get("capacity", 0) > 0 and dest.get("capacity", 0) > 0
            and origin.get("is_renting", True) and dest.get("is_returning", True)
            and origin.get("bikes_available", 0) > 0 and dest.get("docks_available", 0) > 0
            and mission["from_station_id"] != mission["to_station_id"]
        )

    def _quote(self, mission: dict) -> dict:
        dest = self.stations[mission["to_station_id"]]
        weight = self.zone_weights.get(dest["zone"], Decimal("1"))
        bonus = 20 if dest["id"] in self.new_stations else 0
        points = int((Decimal(str(mission["points"])) * weight).quantize(Decimal("1"), rounding=ROUND_HALF_UP)) + bonus
        return {"points": points, "reward_days": points / 100, "zone_weight": float(weight), "new_station_bonus": bonus}

    def _replay(self, user: str, request_id: str, fingerprint: tuple) -> dict | None:
        previous = self.requests.get((user, request_id))
        if previous is None:
            return None
        if previous[0] != fingerprint:
            raise HTTPException(409, "request_id ya fue usado con otros datos")
        return self._view(self.acceptances[previous[1]])

    def _account(self, user: str) -> dict:
        entries = [entry for entry in self.ledger if entry["user_hash"] == user]
        points = sum(entry["points"] for entry in entries)
        return {"points": points, "reward_days": points / 100, "ledger": deepcopy(entries)}

    def _view(self, acceptance: dict) -> dict:
        return {"label": "DEMO", "acceptance": deepcopy(acceptance), "account": self._account(acceptance["user_hash"])}

    def listing(self, user: str) -> dict:
        with self._lock:
            accepted = {a["mission_id"]: a for a in self.acceptances.values() if a["user_hash"] == user}
            return {
                "label": "DEMO",
                "storage": "memoria de un proceso; se reinicia con el servidor",
                "policy": {"points_per_day": 100, "new_station_bonus": 20, "new_station_ids": sorted(self.new_stations), "zone_weights": {k: float(v) for k, v in self.zone_weights.items()}, "note": "Parámetros propuestos, sin canje real. Aceptar simula desbloqueo; la entrega es autodeclarada y no verifica ECOBICI."},
                "missions": [
                    {"id": m["id"], "title": m["title"], "from_station_id": m["from_station_id"], "to_station_id": m["to_station_id"], "window_label": m["window_label"], "eligible": self._eligible(m), "quote": self._quote(m), "acceptance": deepcopy(accepted.get(m["id"]))}
                    for m in self.missions.values()
                    if self._eligible(m) or m["id"] in accepted
                ],
                "account": self._account(user),
            }

    def accept(self, mission_id: str, user: str, bike: str, request_id: str) -> dict:
        with self._lock:
            fingerprint = ("accept", mission_id, bike)
            if replay := self._replay(user, request_id, fingerprint):
                return replay
            mission = self._mission(mission_id)
            for existing in self.acceptances.values():
                if existing["user_hash"] == user and existing["mission_id"] == mission_id:
                    if existing["bike_id"] != bike:
                        raise HTTPException(409, "Esta misión ya está asociada a otra bici")
                    self.requests[(user, request_id)] = (fingerprint, existing["id"])
                    return self._view(existing)
                if existing["status"] == "in_progress" and (existing["user_hash"] == user or existing["bike_id"] == bike):
                    raise HTTPException(409, "Persona o bici con otra misión en curso")
            if not self._eligible(mission):
                raise HTTPException(409, "Estaciones no elegibles para esta misión")
            acceptance = {
                "id": str(uuid4()), "mission_id": mission_id, "user_hash": user, "bike_id": bike,
                "from_station_id": mission["from_station_id"], "to_station_id": mission["to_station_id"],
                "status": "in_progress", "frozen_reward": self._quote(mission),
                "accepted_at": datetime.now(timezone.utc).isoformat(), "awarded_points": 0,
            }
            self.acceptances[acceptance["id"]] = acceptance
            self.requests[(user, request_id)] = (fingerprint, acceptance["id"])
            return self._view(acceptance)

    def complete(self, mission_id: str, user: str, acceptance_id: str, path: list[str], request_id: str) -> dict:
        with self._lock:
            fingerprint = ("complete", mission_id, acceptance_id, tuple(path))
            if replay := self._replay(user, request_id, fingerprint):
                return replay
            acceptance = self.acceptances.get(acceptance_id)
            if not acceptance or acceptance["user_hash"] != user or acceptance["mission_id"] != mission_id:
                raise HTTPException(404, "Aceptación no encontrada")
            if acceptance["status"] != "in_progress":
                if acceptance.get("path") != path:
                    raise HTTPException(409, "La entrega ya terminó con otro recorrido")
                self.requests[(user, request_id)] = (fingerprint, acceptance_id)
                return self._view(acceptance)
            if len(path) < 2 or path[0] != acceptance["from_station_id"] or any(s not in self.stations for s in path):
                raise HTTPException(409, "Recorrido no válido para esta misión")

            origin, dest = acceptance["from_station_id"], acceptance["to_station_id"]
            round_trip = origin in path[1:]
            # Un retorno dividido en otra misión tampoco puede conservar el primer pago.
            previous = next((a for a in reversed(list(self.acceptances.values())) if a["id"] != acceptance_id and a["user_hash"] == user and a["bike_id"] == acceptance["bike_id"] and a["status"] == "completed"), None)
            reverse = previous is not None and previous["from_station_id"] == dest and previous["to_station_id"] == origin and path[-1] == dest
            acceptance.update(path=path.copy(), completed_at=datetime.now(timezone.utc).isoformat())
            if reverse:
                self._entry(previous, -previous["awarded_points"], "round_trip_reversal")
                previous.update(status="reversed", awarded_points=0)
            if round_trip or reverse or path[-1] != dest:
                acceptance.update(status="rejected", reason="round_trip" if round_trip or reverse else "wrong_destination")
            else:
                points = acceptance["frozen_reward"]["points"]
                acceptance.update(status="completed", awarded_points=points)
                self._entry(acceptance, points, "mission_completed")
            self.requests[(user, request_id)] = (fingerprint, acceptance_id)
            return self._view(acceptance)

    def _entry(self, acceptance: dict, points: int, reason: str) -> None:
        self.ledger.append({"id": str(uuid4()), "acceptance_id": acceptance["id"], "user_hash": acceptance["user_hash"], "points": points, "reason": reason, "created_at": datetime.now(timezone.utc).isoformat()})
