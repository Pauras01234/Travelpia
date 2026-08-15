"""Tests for auth routes that don't require live Supabase.

The happy paths hit Supabase (network + real project), so here we cover the
guard clauses that must reject before any Supabase call.
"""

from __future__ import annotations

import pytest


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer "}, {"Authorization": "token abc"}])
def test_me_requires_bearer_token(make_client, headers):
    client, _ = make_client()
    with client:
        resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 401


def test_logout_requires_bearer_token(make_client):
    client, _ = make_client()
    with client:
        resp = client.post("/auth/logout", json={"refresh_token": "x"})
    assert resp.status_code == 401


def test_update_me_requires_bearer_token(make_client):
    client, _ = make_client()
    with client:
        resp = client.patch("/auth/me", json={"full_name": "New Name"})
    assert resp.status_code == 401


@pytest.mark.parametrize("body", [{}, {"refresh_token": ""}])
def test_refresh_rejects_a_missing_token_before_calling_supabase(make_client, body):
    client, _ = make_client()
    with client:
        resp = client.post("/auth/refresh", json=body)
    assert resp.status_code == 422
