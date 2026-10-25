from datetime import datetime, timedelta

from modules.distribucion.engine import Station, Trip, simulate

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
