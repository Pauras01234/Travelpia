"""Tests for GET /places."""

from __future__ import annotations


def test_places_returns_results(make_client):
    client, fakes = make_client()
    with client:
        resp = client.get(
            "/places", params={"query": "restaurants", "county": "Galway"}
        )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["places"]) >= 1
    first = body["places"][0]
    assert first["lat"] and first["lng"]
    assert first["name"]
    # Query + county are threaded through to the service.
    assert fakes["places"].last_call[0] == "restaurants"
    assert fakes["places"].last_call[1] == "Galway"


def test_places_requires_query(make_client):
    client, _ = make_client()
    with client:
        resp = client.get("/places", params={"county": "Galway"})
    assert resp.status_code == 422
