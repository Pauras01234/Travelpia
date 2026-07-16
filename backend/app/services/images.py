"""Unsplash image search, proxied server-side.

The Unsplash access key never reaches the client — the app asks this service,
which returns plain image URLs plus the attribution Unsplash's API terms
require. Results are cached. Failures are soft: an image outage must not fail
an otherwise-good answer, so errors return an empty list.
"""

from __future__ import annotations

import httpx

from app.config import Settings
from app.core.cache import TTLCache
from app.core.logging import get_logger
from app.schemas.ask import Image

logger = get_logger(__name__)

_UNSPLASH_URL = "https://api.unsplash.com/search/photos"


class ImageService:
    """Searches Unsplash for landscape photos matching a query."""

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
        if not self._settings.unsplash_access_key:
            return []

        cache_key = f"images::{limit}::{query.lower()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached

        params = {
            "query": query,
            "per_page": limit,
            "orientation": "landscape",
        }
        headers = {
            "Authorization": f"Client-ID {self._settings.unsplash_access_key}"
        }
        try:
            resp = await self._http.get(
                _UNSPLASH_URL, params=params, headers=headers
            )
            resp.raise_for_status()
            payload = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Unsplash search failed: %s", exc)
            return []

        images: list[Image] = []
        for res in payload.get("results", []):
            url = (res.get("urls") or {}).get("regular")
            if not url:
                continue
            user = (res.get("user") or {}).get("name") or "Unsplash"
            alt = (res.get("alt_description") or query).strip()
            images.append(Image(url=url, alt=alt, credit=f"Photo by {user}"))

        await self._cache.set(cache_key, images)
        return images
