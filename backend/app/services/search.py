"""Web search grounding.

Primary path is Serper (Google) for fresh, cited snippets. If Serper is
unconfigured or returns nothing, we fall back to a Wikipedia summary so the
assistant can still answer for well-known topics. Results are cached to cut
latency and cost for repeated queries.

Failures here are *soft*: search is a best-effort grounding step, so upstream
errors degrade to "no snippets" rather than failing the whole request. The
RAG orchestrator decides what to do when nothing is found.
"""

from __future__ import annotations

import re

import httpx

from app.config import Settings
from app.core.cache import TTLCache
from app.core.logging import get_logger
from app.schemas.ask import Source

logger = get_logger(__name__)

_SERPER_URL = "https://google.serper.dev/search"
_WIKI_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{topic}"
_WHITESPACE = re.compile(r"\s+")


class SearchResult:
    """Grounding snippets plus the sources they came from."""

    __slots__ = ("snippets", "sources")

    def __init__(self, snippets: list[str], sources: list[Source]) -> None:
        self.snippets = snippets
        self.sources = sources

    @property
    def has_content(self) -> bool:
        return bool(self.snippets)


class SearchService:
    """Retrieves grounding text for a query, with caching and fallback."""

    def __init__(
        self,
        settings: Settings,
        http: httpx.AsyncClient,
        cache: TTLCache[SearchResult],
    ) -> None:
        self._settings = settings
        self._http = http
        self._cache = cache

    async def search(self, query: str, limit: int) -> SearchResult:
        cache_key = f"search::{limit}::{query.lower()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self._serper(query, limit)
        if not result.has_content:
            # Fallback keeps the query text (already county-qualified upstream).
            result = await self._wikipedia(query)

        await self._cache.set(cache_key, result)
        return result

    async def _serper(self, query: str, limit: int) -> SearchResult:
        if not self._settings.serper_api_key:
            return SearchResult([], [])

        headers = {
            "X-API-KEY": self._settings.serper_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "q": query,
            "gl": self._settings.serper_country,
            "hl": self._settings.serper_lang,
        }
        try:
            resp = await self._http.post(
                _SERPER_URL, headers=headers, json=payload
            )
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Serper search failed: %s", exc)
            return SearchResult([], [])

        snippets: list[str] = []
        sources: list[Source] = []
        for item in (data.get("organic") or [])[:limit]:
            text = item.get("snippet") or item.get("title") or ""
            text = _WHITESPACE.sub(" ", text).strip()
            if text:
                snippets.append(text)
            link = item.get("link")
            if link:
                sources.append(
                    Source(title=item.get("title") or "Source", url=link)
                )
        return SearchResult(snippets, sources)

    async def _wikipedia(self, query: str) -> SearchResult:
        topic = query.strip().replace(" ", "_")
        url = _WIKI_URL.format(topic=topic)
        try:
            resp = await self._http.get(url)
            if resp.status_code != 200:
                return SearchResult([], [])
            extract = (resp.json().get("extract") or "").strip()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Wikipedia fallback failed: %s", exc)
            return SearchResult([], [])

        if not extract:
            return SearchResult([], [])
        page = resp.json().get("content_urls", {}).get("desktop", {}).get("page")
        sources = [Source(title="Wikipedia", url=page)] if page else []
        return SearchResult([extract], sources)
