"""A small async-safe, TTL in-memory cache.

Deliberately minimal and behind a narrow interface so it can be replaced by
Redis (shared across instances) later without changing call sites. Uses a
monotonic clock so it is immune to wall-clock adjustments.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class _Entry:
    value: Any
    expires_at: float


class TTLCache(Generic[T]):
    """In-memory cache with per-entry expiry and an async lock.

    The lock guards the dict against concurrent mutation from multiple
    coroutines. Lookups are cheap; expired entries are evicted lazily on read
    plus opportunistically on write.
    """

    def __init__(self, ttl_seconds: int, max_entries: int = 1024) -> None:
        self._ttl = ttl_seconds
        self._max = max_entries
        self._data: dict[str, _Entry] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> T | None:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            if time.monotonic() >= entry.expires_at:
                self._data.pop(key, None)
                return None
            return entry.value

    async def set(self, key: str, value: T) -> None:
        async with self._lock:
            self._evict_if_needed()
            self._data[key] = _Entry(
                value=value, expires_at=time.monotonic() + self._ttl
            )

    def _evict_if_needed(self) -> None:
        if len(self._data) < self._max:
            return
        # Drop expired entries first; if still full, evict the soonest-to-expire.
        now = time.monotonic()
        expired = [k for k, e in self._data.items() if e.expires_at <= now]
        for k in expired:
            self._data.pop(k, None)
        if len(self._data) >= self._max:
            oldest = min(self._data, key=lambda k: self._data[k].expires_at)
            self._data.pop(oldest, None)

    async def clear(self) -> None:
        async with self._lock:
            self._data.clear()
