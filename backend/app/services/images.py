"""Image search for the Ask answer gallery.

Backed by Serper's Images endpoint (Google Images) using the same key as
search/places. We previously used Unsplash, but that returns generic stock
photos and needs its own key; Serper gives real, query-relevant photos and
reuses infrastructure that already works.

The image URLs never expose a key (they're public image URLs). Failures are
soft: an image outage returns an empty list so an answer still renders.
"""

from __future__ import annotations

from urllib.parse import urlparse

import httpx

from app.config import Settings
from app.core.cache import TTLCache
from app.core.logging import get_logger
from app.schemas.ask import Image

logger = get_logger(__name__)

_IMAGES_URL = "https://google.serper.dev/images"


class ImageService:
    """Searches Google Images (via Serper) for photos matching a query."""

    def __init__(
        self,
        settings: Settings,
        http: httpx.AsyncClient,
        cache: TTLCache[list[Image]],
    ) -> None:
        self._settings = settings
        self._http = http
        self._cache = cache

    async def search(self, query: str, limit: int) -> list[Image]:
        limit = max(1, min(limit, self._settings.images_max_limit))
        if not self._settings.serper_api_key:
            return []

        cache_key = f"images::{limit}::{query.lower()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached

        headers = {
            "X-API-KEY": self._settings.serper_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "q": query,
            "gl": self._settings.serper_country,
            "hl": self._settings.serper_lang,
            "num": limit,
        }
        try:
            resp = await self._http.post(_IMAGES_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Serper image search failed: %s", exc)
            return []

        images: list[Image] = []
        for item in (data.get("images") or [])[:limit]:
            url = item.get("imageUrl")
            if not url:
                continue
            source = item.get("source") or _domain(item.get("link", "")) or "Google"
            alt = (item.get("title") or query).strip()
            images.append(Image(url=url, alt=alt, credit=source))

        await self._cache.set(cache_key, images)
        return images


def _domain(link: str) -> str:
    try:
        return urlparse(link).netloc
    except ValueError:
        return ""
