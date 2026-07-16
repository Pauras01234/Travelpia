"""Tests for health/readiness probes."""

from __future__ import annotations


def test_health_ok(make_client):
    client, _ = make_client()
    with client:
        resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_readiness_reports_checks(make_client):
    client, _ = make_client()
    with client:
        resp = client.get("/health/ready")
    body = resp.json()
    assert "checks" in body
    assert set(body["checks"]) == {"llm", "search", "images"}
