"""Principal resolution, including the soft-auth rollout stage.

``AUTH_REQUIRED`` controls enforcement, not identification: a request carrying
a token must be attributed to its user even while anonymous callers are still
allowed, otherwise per-account metering can't be switched on without breaking
older app builds that send no token.
"""

from __future__ import annotations

import pytest
from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials

from app.config import Settings
from app.core.errors import AuthError, ConfigurationError
from app.security import auth as auth_module
from app.security.auth import User, get_current_user
from tests.conftest import FakeUsageStore

VERIFIED = User(id="user-42", email="traveller@example.com", is_anonymous=False)


def make_request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/", "headers": []})


def bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.fixture
def verifies(monkeypatch):
    """Make token verification succeed without a live Supabase project."""

    def _verify(token: str, settings: Settings) -> User:
        return VERIFIED

    monkeypatch.setattr(auth_module, "_verify_token", _verify)


@pytest.fixture
def rejects(monkeypatch):
    def _verify(token: str, settings: Settings) -> User:
        raise AuthError("Invalid or expired authentication token.")

    monkeypatch.setattr(auth_module, "_verify_token", _verify)


# -- AUTH_REQUIRED=false ---------------------------------------------------
async def test_no_token_is_anonymous():
    user = await get_current_user(
        make_request(), None, Settings(auth_required=False)
    )
    assert user.is_anonymous


async def test_token_is_identified_even_when_auth_is_optional(verifies):
    """The soft-auth stage: metering works before the flag is flipped."""
    user = await get_current_user(
        make_request(), bearer("good"), Settings(auth_required=False)
    )
    assert user == VERIFIED
    assert not user.is_anonymous


async def test_unverifiable_token_degrades_to_anonymous(rejects):
    """An open route must not become stricter just because a token was sent."""
    user = await get_current_user(
        make_request(), bearer("rubbish"), Settings(auth_required=False)
    )
    assert user.is_anonymous


async def test_unconfigured_jwks_degrades_to_anonymous(monkeypatch):
    """Local/dev environments with no Supabase config must keep working."""

    def _verify(token: str, settings: Settings) -> User:
        raise ConfigurationError("JWKS not configured")

    monkeypatch.setattr(auth_module, "_verify_token", _verify)

    user = await get_current_user(
        make_request(), bearer("good"), Settings(auth_required=False)
    )
    assert user.is_anonymous


# -- AUTH_REQUIRED=true ----------------------------------------------------
async def test_missing_token_is_rejected_when_auth_is_required():
    with pytest.raises(AuthError):
        await get_current_user(
            make_request(), None, Settings(auth_required=True)
        )


async def test_bad_token_is_rejected_when_auth_is_required(rejects):
    with pytest.raises(AuthError):
        await get_current_user(
            make_request(), bearer("rubbish"), Settings(auth_required=True)
        )


# -- end to end ------------------------------------------------------------
def test_a_token_bearing_request_is_metered_with_auth_optional(
    make_client, verifies
):
    """The whole point: updated clients get a quota, old ones keep working."""
    usage = FakeUsageStore()
    client, fakes = make_client(
        usage=usage, settings_overrides={"free_daily_asks": 5}
    )
    with client:
        metered = client.post(
            "/ask",
            json={"county": "Galway", "question": "walks?", "mode": "fast"},
            headers={"Authorization": "Bearer good"},
        ).json()

        # Same app, no token — an older build; still served, still unmetered.
        legacy = client.post(
            "/ask",
            json={"county": "Galway", "question": "walks?", "mode": "fast"},
        ).json()

    assert metered["quota"]["remaining"] == 4
    assert legacy["quota"] is None
    assert fakes["usage"].counts[VERIFIED.id] == 1
