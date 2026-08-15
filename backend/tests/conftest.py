"""Shared test fixtures.

Tests exercise the real app (routing, validation, error handling, caching)
but replace the three external-dependency services — search, images, LLM —
with in-memory fakes, so no network calls are made and behaviour is
deterministic.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.api.deps import (
    get_image_service,
    get_intent_router,
    get_llm_client,
    get_places_service,
    get_rag_service,
    get_search_service,
)
from app.config import Settings, get_settings
from app.core.cache import TTLCache
from app.core.rate_limit import RateLimiter
from app.domain.plans import Plan
from app.main import create_app
from app.schemas.ask import Image, Source
from app.schemas.places import MapPlace
from app.security.auth import User, get_current_user
from app.security.limits import (
    get_plan_resolver,
    get_rate_limiter,
    get_usage_store,
)
from app.services.intent import RouteDecision
from app.services.rag import RagService
from app.services.search import SearchResult

#: A signed-in principal for tests that need metering (anonymous callers are
#: deliberately unmetered — see security/limits.py).
SIGNED_IN = User(id="user-1", email="traveller@example.com", is_anonymous=False)


class FakeLLM:
    """Records call count and echoes a canned answer (optionally with echo)."""

    def __init__(self, answer: str = "Galway is lovely in summer.") -> None:
        self.answer = answer
        self.calls = 0

    async def generate(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        self.calls += 1
        return self.answer

    async def aclose(self) -> None:  # pragma: no cover
        pass


class FakeSearch:
    def __init__(self, result: SearchResult) -> None:
        self._result = result
        self.calls = 0
        self.last_query: str | None = None

    async def search(self, query: str, limit: int) -> SearchResult:
        self.calls += 1
        self.last_query = query
        return self._result


class FakeRouter:
    """Returns a fixed decision; defaults to a passthrough search query."""

    def __init__(self, decision: RouteDecision | None = None) -> None:
        self._decision = decision
        self.calls = 0

    async def route(self, county, question, history) -> RouteDecision:
        self.calls += 1
        if self._decision is not None:
            return self._decision
        return RouteDecision(
            route="search", reply="", search_query=f"{question} {county} Ireland"
        )


class FakeImages:
    def __init__(self, images: list[Image] | None = None) -> None:
        self._images = images or []

    async def search(self, query: str, limit: int) -> list[Image]:
        return list(self._images)


class FakePlaces:
    def __init__(self, places: list[MapPlace] | None = None) -> None:
        self._places = (
            places
            if places is not None
            else [
                MapPlace(
                    id="cid1",
                    name="Brasserie On The Corner",
                    address="25 Eglinton St",
                    lat=53.2746,
                    lng=-9.0528,
                    rating=4.6,
                    category="Seafood",
                )
            ]
        )
        self.last_call: tuple[str, str, int] | None = None

    async def search(self, query: str, county: str, limit: int) -> list[MapPlace]:
        self.last_call = (query, county, limit)
        return list(self._places)


class FakeUsageStore:
    """In-memory daily counter that can be told to fail like a real outage."""

    def __init__(
        self,
        counts: dict[str, int] | None = None,
        *,
        fail_reads: bool = False,
        fail_writes: bool = False,
    ) -> None:
        self.counts = dict(counts or {})
        self.fail_reads = fail_reads
        self.fail_writes = fail_writes
        self.increments = 0

    async def get_today(self, user_id: str) -> int:
        if self.fail_reads:
            raise RuntimeError("usage store unavailable")
        return self.counts.get(user_id, 0)

    async def increment(self, user_id: str) -> int:
        self.increments += 1
        if self.fail_writes:
            raise RuntimeError("usage store unavailable")
        self.counts[user_id] = self.counts.get(user_id, 0) + 1
        return self.counts[user_id]


class FakePlanResolver:
    """Returns a fixed plan, or fails to exercise the fail-closed path."""

    def __init__(self, plan: Plan = Plan.free, *, fail: bool = False) -> None:
        self.plan = plan
        self.fail = fail
        self.calls = 0

    async def get_plan(self, user_id: str) -> Plan:
        self.calls += 1
        if self.fail:
            raise RuntimeError("plan lookup unavailable")
        return self.plan


@pytest.fixture
def make_client():
    """Factory: build a TestClient with the given fakes wired in."""

    def _make(
        *,
        search: SearchResult | None = None,
        images: list[Image] | None = None,
        llm: FakeLLM | None = None,
        route: RouteDecision | None = None,
        user: User | None = None,
        usage: FakeUsageStore | None = None,
        plans: FakePlanResolver | None = None,
        rate_limit: int = 1_000,
        settings_overrides: dict | None = None,
    ) -> tuple[TestClient, dict]:
        get_settings.cache_clear()
        app = create_app()

        fake_search = FakeSearch(
            search
            if search is not None
            else SearchResult(
                ["Salthill promenade is a popular walk."],
                [Source(title="Failte Ireland", url="https://example.com/a")],
            )
        )
        fake_images = FakeImages(images)
        fake_llm = llm or FakeLLM()
        fake_router = FakeRouter(route)
        fake_places = FakePlaces()
        response_cache: TTLCache = TTLCache(ttl_seconds=60)

        app.dependency_overrides[get_search_service] = lambda: fake_search
        app.dependency_overrides[get_image_service] = lambda: fake_images
        app.dependency_overrides[get_llm_client] = lambda: fake_llm
        app.dependency_overrides[get_intent_router] = lambda: fake_router
        app.dependency_overrides[get_places_service] = lambda: fake_places
        app.dependency_overrides[get_rag_service] = lambda: RagService(
            settings=get_settings(),
            search=fake_search,
            images=fake_images,
            llm=fake_llm,
            router=fake_router,
            places=fake_places,
            response_cache=response_cache,
        )

        # Quota + limits. Overriding the providers (rather than app.state)
        # keeps these independent of whether the lifespan has run.
        fake_usage = usage or FakeUsageStore()
        fake_plans = plans or FakePlanResolver()
        app.dependency_overrides[get_usage_store] = lambda: fake_usage
        app.dependency_overrides[get_plan_resolver] = lambda: fake_plans
        # One shared instance — building it inside the lambda would hand every
        # request a fresh window and silently disable the limiter.
        limiter = RateLimiter(limit=rate_limit, window_seconds=60)
        app.dependency_overrides[get_rate_limiter] = lambda: limiter

        # Init kwargs outrank the environment in pydantic-settings, so this
        # pins limits regardless of the developer's local .env.
        if settings_overrides:
            settings = Settings(**settings_overrides)
            app.dependency_overrides[get_settings] = lambda: settings

        # Default principal stays anonymous so existing tests are unaffected.
        if user is not None:
            app.dependency_overrides[get_current_user] = lambda: user

        client = TestClient(app)
        return client, {
            "search": fake_search,
            "images": fake_images,
            "llm": fake_llm,
            "router": fake_router,
            "places": fake_places,
            "usage": fake_usage,
            "plans": fake_plans,
        }

    return _make
