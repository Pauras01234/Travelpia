"""Resolves which plan a user is on.

Plans change rarely and are read on every metered request, so the lookup sits
behind a short TTL cache. The TTL is the upper bound on how long an upgrade
takes to take effect — keep it small (see ``plan_cache_ttl_seconds``).
"""

from __future__ import annotations

from typing import Callable, Protocol

from anyio import to_thread

from app.core.cache import TTLCache
from app.domain.plans import Plan
from app.supabase_client import get_supabase

_TABLE = "profiles"


class PlanResolver(Protocol):
    """Look up a user's entitlement tier."""

    async def get_plan(self, user_id: str) -> Plan: ...


class SupabasePlanResolver:
    """Reads ``profiles.plan``, memoised per user for a short window.

    Raises on failure rather than defaulting silently — the caller owns the
    fail-closed policy so it is visible at the enforcement point.
    """

    def __init__(
        self,
        cache: TTLCache[str],
        client_factory: Callable[[], object] = get_supabase,
    ) -> None:
        self._cache = cache
        self._client_factory = client_factory

    async def get_plan(self, user_id: str) -> Plan:
        cached = await self._cache.get(user_id)
        if cached is not None:
            return Plan.coerce(cached)

        raw = await to_thread.run_sync(self._fetch_sync, user_id)
        plan = Plan.coerce(raw)
        await self._cache.set(user_id, plan.value)
        return plan

    def _fetch_sync(self, user_id: str) -> object:
        result = (
            self._client_factory()
            .table(_TABLE)
            .select("plan")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if result is None or not result.data:
            # No profile row — Plan.coerce maps this to the free tier.
            return None
        return result.data.get("plan")
