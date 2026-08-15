"""A small async-safe fixed-window rate limiter.

Deliberately approximate — this is an abuse fence, not an accounting system.
State is per-process, so with N instances the effective ceiling is N x limit;
that is fine for stopping a script, and the durable daily quota is what
actually protects spend. Mirrors :class:`~app.core.cache.TTLCache` in shape so
both can move to Redis together when the service scales out.
"""

from __future__ import annotations

import asyncio
import math
import time
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RateLimitStatus:
    """Outcome of a single limiter check."""

    allowed: bool
    remaining: int
    retry_after: int  # seconds until the window resets; 0 when allowed


@dataclass(slots=True)
class _Window:
    count: int
    expires_at: float


class RateLimiter:
    """Counts requests per key within a fixed window."""

    def __init__(
        self, limit: int, window_seconds: int, max_keys: int = 4096
    ) -> None:
        self._limit = limit
        self._window = window_seconds
        self._max_keys = max_keys
        self._data: dict[str, _Window] = {}
        self._lock = asyncio.Lock()

    async def hit(self, key: str) -> RateLimitStatus:
        """Record one request against ``key`` and report whether it is allowed."""
        # Monotonic: immune to wall-clock adjustments, same as the TTL cache.
        now = time.monotonic()
        async with self._lock:
            self._evict(now)
            window = self._data.get(key)
            if window is None or now >= window.expires_at:
                window = _Window(count=0, expires_at=now + self._window)
                self._data[key] = window

            if window.count >= self._limit:
                # Always report at least 1s so clients never busy-retry.
                retry_after = max(1, math.ceil(window.expires_at - now))
                return RateLimitStatus(
                    allowed=False, remaining=0, retry_after=retry_after
                )

            window.count += 1
            return RateLimitStatus(
                allowed=True,
                remaining=max(0, self._limit - window.count),
                retry_after=0,
            )

    def _evict(self, now: float) -> None:
        """Drop expired windows; if still at capacity, drop the oldest."""
        if len(self._data) < self._max_keys:
            return
        for key in [k for k, w in self._data.items() if w.expires_at <= now]:
            self._data.pop(key, None)
        if len(self._data) >= self._max_keys:
            oldest = min(self._data, key=lambda k: self._data[k].expires_at)
            self._data.pop(oldest, None)
