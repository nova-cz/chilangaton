import pytest

from shared.contracts import station_ids

CODES = ["014", "14", "CE-014", "271-272", "CE-271-272", "271.0", " 18 ", "0235-0236", "001", "99"]


def test_normalization_examples():
    assert [station_ids.station_key(c) for c in ("014", "CE-014", "271-272", "0235-0236", "271.0")] == \
        ["14", "14", "271-272", "235-236", "271"]
    assert station_ids.station_key("CE-271-272 Jesús García - Puente") == "271-272"
    assert station_ids.station_key("Estación maratón") is None and station_ids.station_key(None) is None


def test_same_result_as_line1_and_line3():
    bici = pytest.importorskip("modules.bici_util.engine")
    viaje = pytest.importorskip("modules.viaje.engine")
    for code in CODES:
        assert station_ids.station_key(code) == bici.station_key(code) == viaje.station_key(code), code


def test_map_round_trip():
    m = station_ids.ce_to_feed_map()
    assert len(m) == 677
    for ce, feed in list(m.items())[:50]:
        assert station_ids.feed_to_ce(feed) == ce
        assert station_ids.ce_to_feed(f"CE-{ce}") == feed
    assert station_ids.ce_to_feed("99999") is None and station_ids.feed_to_ce("nope", "?") == "?"
