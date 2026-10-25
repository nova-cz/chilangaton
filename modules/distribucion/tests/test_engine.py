from datetime import datetime, timedelta
from dataclasses import replace

import pytest

from modules.distribucion.engine import Station, Trip, build_neighbors, simulate

START = datetime(2026, 9, 29, 7, 0)
END = datetime(2026, 9, 29, 10, 0)


def mini():
    """A (se llena) -> B (se vacia, 0 bicis) con C vacia a ~200 m de B; D llena."""
    stations = [
        Station("A", 19.4300, -99.1700, 10, 8, 0, "Reforma"),
        Station("B", 19.4460, -99.1530, 6, 0, 0, "Buenavista"),
        Station("C", 19.4470, -99.1540, 6, 0, 1, "Buenavista"),
        Station("D", 19.4000, -99.1000, 4, 4, 0, None),
    ]
    trips = [Trip("A", "B", START + timedelta(minutes=10 * k), START + timedelta(minutes=10 * k + 20)) for k in range(6)]
    trips += [Trip("B", "D", START + timedelta(minutes=5), START + timedelta(minutes=30))]  # salida sin bicis
    trips += [Trip("A", "D", START + timedelta(minutes=15), START + timedelta(minutes=40))]  # llega a estacion llena
    return stations, trips


def run(**kw):
    stations, trips = mini()
    return simulate(stations, trips, adoption=kw.pop("adoption", 0.5), recovered=kw.pop("recovered", False), return_final=True, **kw)


def test_same_seed_same_result():
    assert run(seed=7) == run(seed=7)


def test_inventory_stays_between_zero_and_capacity():
    for adoption in (0, 0.5, 1):
        for recovered in (False, True):
            result = run(adoption=adoption, recovered=recovered)
            for bikes, disabled, cap in result["final_inventory"].values():
                assert 0 <= bikes <= cap
                assert 0 <= bikes + disabled <= cap


def test_empty_departure_is_lost_and_full_arrival_is_diverted():
    totals = run(adoption=0)["totals"]
    assert totals["lost_trips"] == 1
    assert totals["diverted_arrivals"] >= 1


def test_adoption_moves_bikes_to_nearest_empty_station():
    base = run(adoption=0)["totals"]
    adopted = run(adoption=1)["totals"]
    assert adopted["bikes_moved"] > 0
    assert adopted["empty_station_hours_target"] <= base["empty_station_hours_target"]


def test_recovered_returns_disabled_bikes():
    stations, trips = mini()
    result = simulate(stations, [], adoption=0, recovered=True, return_final=True)
    assert result["final_inventory"]["C"][0] == 1  # su bici deshabilitada vuelve a servicio


def test_series_every_15_minutes_in_utc():
    series = run()["series"]
    assert len(series) == 13
    assert series[0]["ts"] == "2026-09-29T13:00:00Z"
    assert series[1]["ts"] == "2026-09-29T13:15:00Z"


@pytest.mark.parametrize("field,value", [("is_renting", False), ("is_returning", False), ("is_installed", False), ("capacity", 0)])
@pytest.mark.parametrize("recovered", [False, True])
def test_closed_stations_do_not_count_as_empty_full_or_recoverable(field, value, recovered):
    stations, trips = mini()
    closed = replace(Station("closed", 19.4471, -99.1541, 8, 0, 8, "Buenavista"), **{field: value})
    expected = simulate(stations, trips, adoption=1, recovered=recovered, return_final=True)
    # Incluir vecinos precalculados prueba que no se reutilizan índices anteriores al filtro.
    extended = [closed, *stations]
    actual = simulate(extended, trips, adoption=1, recovered=recovered, neighbors=build_neighbors(extended), return_final=True)
    assert actual == expected
    assert "closed" not in actual["final_inventory"]


def test_adoption_and_full_arrival_skip_the_nearest_closed_station():
    stations = [
        Station("A", 19.4300, -99.1700, 10, 4, 0, "Reforma"),
        Station("B", 19.4460, -99.1530, 2, 2, 0, "Buenavista"),
        Station("closed", 19.4461, -99.1531, 8, 0, 0, "Buenavista", is_returning=False),
        Station("C", 19.4470, -99.1540, 8, 0, 0, "Buenavista"),
    ]
    trip = Trip("A", "B", START, START + timedelta(minutes=20))
    for adoption in (0, 1):
        result = simulate(stations, [trip], adoption=adoption, recovered=False, return_final=True)
        assert result["final_inventory"]["C"][0] == 1
        assert "closed" not in result["final_inventory"]


def test_trips_touching_excluded_stations_are_not_replayed():
    stations, trips = mini()
    stations.append(Station("closed", 19.44, -99.16, 10, 8, 0, "Reforma", is_renting=False))
    expected = simulate(stations, trips, adoption=1, recovered=False)
    trips.extend([Trip("closed", "B", START, START + timedelta(minutes=10)), Trip("A", "closed", START, START + timedelta(minutes=10))])
    assert simulate(stations, trips, adoption=1, recovered=False) == expected
