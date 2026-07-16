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
    get_llm_client,
    get_rag_service,
    get_search_service,
)
from app.config import get_settings
from app.core.cache import TTLCache
from app.main import create_app
from app.schemas.ask import Image, Source
from app.services.rag import RagService
from app.services.search import SearchResult


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

    async def search(self, query: str, limit: int) -> SearchResult:
        self.calls += 1
        return self._result


class FakeImages:
    def __init__(self, images: list[Image] | None = None) -> None:
        self._images = images or []

    async def search(self, query: str, limit: int) -> list[Image]:
        return list(self._images)


@pytest.fixture
def make_client():
    """Factory: build a TestClient with the given fakes wired in."""

    def _make(
        *,
        search: SearchResult | None = None,
        images: list[Image] | None = None,
        llm: FakeLLM | None = None,
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
        response_cache: TTLCache = TTLCache(ttl_seconds=60)

        app.dependency_overrides[get_search_service] = lambda: fake_search
        app.dependency_overrides[get_image_service] = lambda: fake_images
        app.dependency_overrides[get_llm_client] = lambda: fake_llm
        app.dependency_overrides[get_rag_service] = lambda: RagService(
            settings=get_settings(),
            search=fake_search,
            images=fake_images,
            llm=fake_llm,
            response_cache=response_cache,
        )

        client = TestClient(app)
        return client, {
            "search": fake_search,
            "images": fake_images,
            "llm": fake_llm,
        }

    return _make
