"""Metering behaviour for POST /ask.

Covers the two policies that are easy to get wrong — *what* gets charged, and
what happens when the stores backing the quota fail.
"""

from __future__ import annotations

import pytest

from app.core.errors import UpstreamServiceError
from app.domain.plans import Plan
from app.security.auth import User, get_current_user
from app.services.intent import RouteDecision
from app.services.search import SearchResult
from tests.conftest import SIGNED_IN, FakePlanResolver, FakeUsageStore

QUESTION = {"county": "Galway", "question": "best coastal walks?", "mode": "fast"}
CHAT = {"county": "Galway", "question": "thanks!", "mode": "fast"}


def ask(client, payload=None):
    return client.post("/ask", json=payload or QUESTION)


# -- what gets charged -----------------------------------------------------
def test_grounded_answer_is_charged_and_reports_remaining(make_client):
    client, fakes = make_client(
        user=SIGNED_IN, settings_overrides={"free_daily_asks": 5}
    )
    with client:
        body = ask(client).json()

    assert body["quota"] == {
        "plan": "free",
        "limit": 5,
        "remaining": 4,
        "resets_at": body["quota"]["resets_at"],
    }
    assert fakes["usage"].counts[SIGNED_IN.id] == 1


def test_small_talk_is_never_charged(make_client):
    client, fakes = make_client(
        user=SIGNED_IN,
        route=RouteDecision(route="chat", reply="You're welcome!", search_query=""),
        settings_overrides={"free_daily_asks": 5},
    )
    with client:
        body = ask(client, CHAT).json()

    assert body["grounded"] is False
    assert body["quota"]["remaining"] == 5
    assert fakes["usage"].increments == 0


def test_no_results_answer_is_not_charged(make_client):
    client, fakes = make_client(
        user=SIGNED_IN,
        search=SearchResult([], []),
        settings_overrides={"free_daily_asks": 5},
    )
    with client:
        body = ask(client).json()

    assert body["grounded"] is False
    assert fakes["usage"].increments == 0


def test_upstream_failure_is_not_charged(make_client):
    class ExplodingLLM:
        calls = 0

        async def generate(self, *args, **kwargs):
            raise UpstreamServiceError("the model provider timed out")

        async def aclose(self):  # pragma: no cover
            pass

    client, fakes = make_client(user=SIGNED_IN, llm=ExplodingLLM())
    with client:
        assert ask(client).status_code == 502
    assert fakes["usage"].increments == 0


def test_cached_answer_is_still_charged(make_client):
    client, fakes = make_client(
        user=SIGNED_IN, settings_overrides={"free_daily_asks": 5}
    )
    with client:
        first = ask(client).json()
        second = ask(client).json()

    assert second["cached"] is True
    assert first["quota"]["remaining"] == 4
    assert second["quota"]["remaining"] == 3


def test_quota_is_not_leaked_between_users_via_the_response_cache(make_client):
    """A cache hit must report the *caller's* quota, not the first caller's."""
    other = User(id="user-2", email="b@example.com", is_anonymous=False)
    usage = FakeUsageStore({other.id: 3})
    client, _ = make_client(
        user=SIGNED_IN, usage=usage, settings_overrides={"free_daily_asks": 5}
    )
    with client:
        first = ask(client).json()
        # Same question, different caller — served from the response cache.
        client.app.dependency_overrides[get_current_user] = lambda: other
        second = ask(client).json()

    assert second["cached"] is True
    assert first["quota"]["remaining"] == 4  # user-1: 0 used -> 1
    assert second["quota"]["remaining"] == 1  # user-2: 3 used -> 4


# -- limits ----------------------------------------------------------------
def test_free_user_at_limit_is_rejected_before_any_upstream_call(make_client):
    usage = FakeUsageStore({SIGNED_IN.id: 5})
    client, fakes = make_client(
        user=SIGNED_IN, usage=usage, settings_overrides={"free_daily_asks": 5}
    )
    with client:
        resp = ask(client)

    assert resp.status_code == 429
    body = resp.json()
    assert body["error"] == "quota_exceeded"
    assert body["meta"]["remaining"] == 0
    assert body["meta"]["limit"] == 5
    assert body["meta"]["resets_at"]
    # The whole point of checking first: no tokens were spent.
    assert fakes["llm"].calls == 0
    assert fakes["search"].calls == 0


def test_everything_is_refused_at_the_limit_including_small_talk(make_client):
    """Deliberate: an exhausted account costs zero upstream calls.

    Enforcement sits in a dependency, before the intent router runs, so chat
    and a real question can't be told apart without spending an LLM call. We
    refuse both. The app disables its input to match — if that ever changes,
    this test and the two READMEs change with it.
    """
    client, fakes = make_client(
        user=SIGNED_IN,
        usage=FakeUsageStore({SIGNED_IN.id: 5}),
        route=RouteDecision(route="chat", reply="You're welcome!", search_query=""),
        settings_overrides={"free_daily_asks": 5},
    )
    with client:
        resp = ask(client, CHAT)

    assert resp.status_code == 429
    assert resp.json()["error"] == "quota_exceeded"
    # Not even the cheap intent-router call is made.
    assert fakes["router"].calls == 0
    assert fakes["llm"].calls == 0


def test_premium_user_passes_the_free_limit(make_client):
    usage = FakeUsageStore({SIGNED_IN.id: 20})
    client, _ = make_client(
        user=SIGNED_IN,
        usage=usage,
        plans=FakePlanResolver(Plan.premium),
        settings_overrides={"free_daily_asks": 5, "premium_daily_asks": 200},
    )
    with client:
        body = ask(client).json()

    assert body["quota"]["plan"] == "premium"
    assert body["quota"]["remaining"] == 179


def test_premium_cap_is_still_enforced(make_client):
    usage = FakeUsageStore({SIGNED_IN.id: 200})
    client, _ = make_client(
        user=SIGNED_IN,
        usage=usage,
        plans=FakePlanResolver(Plan.premium),
        settings_overrides={"premium_daily_asks": 200},
    )
    with client:
        assert ask(client).status_code == 429


def test_anonymous_callers_are_unmetered(make_client):
    """Legacy app builds send no token; a shared counter would lock out all."""
    client, fakes = make_client()  # default principal is anonymous
    with client:
        body = ask(client).json()

    assert body["quota"] is None
    assert fakes["usage"].increments == 0


def test_kill_switch_disables_metering(make_client):
    usage = FakeUsageStore({SIGNED_IN.id: 999})
    client, _ = make_client(
        user=SIGNED_IN, usage=usage, settings_overrides={"quota_enabled": False}
    )
    with client:
        body = ask(client).json()

    assert body["quota"] is None


# -- capability gating -----------------------------------------------------
def test_detailed_mode_is_premium_only(make_client):
    client, fakes = make_client(
        user=SIGNED_IN, settings_overrides={"free_detailed_mode": False}
    )
    with client:
        resp = ask(client, {**QUESTION, "mode": "detailed"})

    assert resp.status_code == 403
    body = resp.json()
    assert body["error"] == "premium_required"
    assert body["meta"]["feature"] == "detailed_mode"
    assert fakes["llm"].calls == 0


def test_premium_may_use_detailed_mode(make_client):
    client, _ = make_client(user=SIGNED_IN, plans=FakePlanResolver(Plan.premium))
    with client:
        resp = ask(client, {**QUESTION, "mode": "detailed"})

    assert resp.status_code == 200
    assert resp.json()["mode"] == "detailed"


# -- failure policies ------------------------------------------------------
def test_usage_outage_fails_open(make_client):
    """A store blip must not take Ask down for paying users."""
    client, _ = make_client(
        user=SIGNED_IN, usage=FakeUsageStore(fail_reads=True)
    )
    with client:
        body = ask(client).json()

    assert body["answer"]
    assert body["quota"] is None  # served unmetered


def test_plan_outage_fails_closed_to_free(make_client):
    """An entitlement outage must never grant premium."""
    usage = FakeUsageStore({SIGNED_IN.id: 5})
    client, _ = make_client(
        user=SIGNED_IN,
        usage=usage,
        plans=FakePlanResolver(fail=True),
        settings_overrides={"free_daily_asks": 5, "premium_daily_asks": 200},
    )
    with client:
        resp = ask(client)

    # Treated as free, so the free limit applies.
    assert resp.status_code == 429
    assert resp.json()["meta"]["plan"] == "free"


def test_increment_failure_does_not_fail_a_delivered_answer(make_client):
    client, fakes = make_client(
        user=SIGNED_IN,
        usage=FakeUsageStore(fail_writes=True),
        settings_overrides={"free_daily_asks": 5},
    )
    with client:
        resp = ask(client)

    assert resp.status_code == 200
    assert fakes["usage"].increments == 1
    # Counter stays honest for this response even though the write failed.
    assert resp.json()["quota"]["remaining"] == 4


# -- rate limiting ---------------------------------------------------------
def test_rate_limit_returns_429_with_retry_after(make_client):
    client, _ = make_client(user=SIGNED_IN, rate_limit=2)
    with client:
        assert ask(client).status_code == 200
        assert ask(client).status_code == 200
        resp = ask(client)

    assert resp.status_code == 429
    assert resp.json()["error"] == "rate_limited"
    assert int(resp.headers["Retry-After"]) >= 1


@pytest.mark.parametrize("path", ["/places?query=food&county=Galway", "/images?query=galway"])
def test_rate_limit_also_guards_the_other_ai_routes(make_client, path):
    client, _ = make_client(user=SIGNED_IN, rate_limit=1)
    with client:
        assert client.get(path).status_code == 200
        assert client.get(path).status_code == 429
