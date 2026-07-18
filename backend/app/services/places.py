"""Places search via Serper's Places (Google Maps) endpoint.

Lets the Map search for *any* real place — not a fixed list — returning
coordinates, ratings and categories to drop pins. The Serper key stays
server-side (same pattern as search/images). Failures are soft: an outage
returns an empty list so the Map degrades gracefully rather than erroring.
"""

from __future__ import annotations

import httpx

from app.config import Settings
from app.core.cache import TTLCache
from app.core.logging import get_logger
from app.schemas.places import MapPlace

logger = get_logger(__name__)

_PLACES_URL = "https://google.serper.dev/places"
_IMAGES_URL = "https://google.serper.dev/images"


class PlacesService:
    def __init__(
        self,
        settings: Settings,
        http: httpx.AsyncClient,
        cache: TTLCache[list[MapPlace]],
    ) -> None:
        self._settings = settings
        self._http = http
        self._cache = cache

    async def search(self, query: str, county: str, limit: int) -> list[MapPlace]:
        if not self._settings.serper_api_key:
            return []

        # Scope the query to the county + Ireland for locally-relevant results.
        parts = [query.strip(), county.strip(), "Ireland"]
        q = " ".join(p for p in parts if p)

        cache_key = f"places::{limit}::{q.lower()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached

        headers = {
            "X-API-KEY": self._settings.serper_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "q": q,
            "gl": self._settings.serper_country,
            "hl": self._settings.serper_lang,
        }
        try:
            resp = await self._http.post(_PLACES_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Serper places search failed: %s", exc)
            return []

        places: list[MapPlace] = []
        for item in (data.get("places") or [])[:limit]:
            lat = item.get("latitude")
            lng = item.get("longitude")
            if lat is None or lng is None:
                continue  # can't pin a place without coordinates
            places.append(
                MapPlace(
                    id=str(item.get("cid") or f"{lat},{lng}"),
                    name=item.get("title") or "Place",
                    address=item.get("address") or "",
                    lat=float(lat),
                    lng=float(lng),
                    rating=item.get("rating"),
                    rating_count=item.get("ratingCount"),
                    category=item.get("category") or "",
                    price_level=item.get("priceLevel") or "",
                )
            )

        await self._cache.set(cache_key, places)
        return places

    async def photo(self, query: str) -> str | None:
        """Return a representative photo URL for a place, via Serper Images.

        Used lazily by the selected place's detail card. Soft-fails to None.
        """
        q = query.strip()
        if not self._settings.serper_api_key or not q:
            return None

        cache_key = f"photo::{q.lower()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached  # type: ignore[return-value]

        headers = {
            "X-API-KEY": self._settings.serper_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "q": q,
            "gl": self._settings.serper_country,
            "hl": self._settings.serper_lang,
            "num": 1,
        }
        try:
            resp = await self._http.post(_IMAGES_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Serper image search failed: %s", exc)
            return None

        images = data.get("images") or []
        url = images[0].get("imageUrl") if images else None
        if url:
            await self._cache.set(cache_key, url)
        return url
