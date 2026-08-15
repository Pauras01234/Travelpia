"""Durable daily usage counters backing the Ask quota.

The counter *must* outlive the process: an in-memory tally resets on every
deploy (handing everyone a fresh allowance) and is not shared across
instances. It lives in Postgres, incremented through a single atomic
statement so concurrent requests cannot both read N and both write N+1.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Callable, Protocol

from anyio import to_thread

from app.supabase_client import get_supabase

_TABLE = "usage_daily"
_INCREMENT_RPC = "increment_ask_usage"


def utc_today() -> date:
    """The current quota day.

    UTC rather than a per-user timezone: Ireland sits at UTC/UTC+1, so the
    boundary lands within an hour of local midnight without storing a timezone
    per account.
    """
    return datetime.now(timezone.utc).date()


def next_reset_at() -> datetime:
    """Start of the next UTC day — when the allowance resets."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    return tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)


class UsageStore(Protocol):
    """Read/increment a user's grounded-answer count for the current day."""

    async def get_today(self, user_id: str) -> int: ...

    async def increment(self, user_id: str) -> int: ...


class SupabaseUsageStore:
    """`usage_daily`-backed counter.

    ``supabase-py`` is synchronous and ``/ask`` is an async handler, so every
    call is pushed to a worker thread — a blocking round trip inside the event
    loop would stall every other in-flight request on the worker.
    """

    def __init__(self, client_factory: Callable[[], object] = get_supabase) -> None:
        self._client_factory = client_factory

    async def get_today(self, user_id: str) -> int:
        return await to_thread.run_sync(self._get_today_sync, user_id)

    async def increment(self, user_id: str) -> int:
        return await to_thread.run_sync(self._increment_sync, user_id)

    # -- sync bodies (run in a worker thread) -----------------------------
    def _get_today_sync(self, user_id: str) -> int:
        result = (
            self._client_factory()
            .table(_TABLE)
            .select("ask_count")
            .eq("user_id", user_id)
            .eq("day", utc_today().isoformat())
            .maybe_single()
            .execute()
        )
        # maybe_single() returns None when no row exists — a user's first ask
        # of the day, not an error.
        if result is None or not result.data:
            return 0
        return int(result.data.get("ask_count") or 0)

    def _increment_sync(self, user_id: str) -> int:
        result = self._client_factory().rpc(
            _INCREMENT_RPC, {"p_user": user_id}
        ).execute()
        return int(result.data or 0)
