"""Request limits for the AI routes.

Two independent mechanisms that are easy to confuse:

* **Rate limit** — an abuse fence. Short window, per-process, approximate. A
  real user never reaches it; a script does.
* **Daily quota** — a product boundary users are *expected* to reach. Backed
  by a durable counter and surfaced to the client as an upgrade prompt rather
  than an error.

The quota is resolved *before* any upstream call, so a blocked request costs
nothing, and committed *after* a grounded answer, so small talk, empty
searches and upstream failures are all free.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.core.errors import (
    PremiumRequiredError,
    QuotaExceededError,
    RateLimitError,
)
from app.core.logging import get_logger
from app.core.rate_limit import RateLimiter
from app.domain.plans import Plan, PlanLimits, limits_for
from app.schemas.ask import AskMode, QuotaState
from app.security.auth import User, get_current_user
from app.services.entitlements import PlanResolver
from app.services.usage import UsageStore, next_reset_at

logger = get_logger(__name__)


# -- providers (shared instances built once in the lifespan handler) --------
def get_usage_store(request: Request) -> UsageStore:
    return request.app.state.usage_store


def get_plan_resolver(request: Request) -> PlanResolver:
    return request.app.state.plan_resolver


def get_rate_limiter(request: Request) -> RateLimiter:
    return request.app.state.rate_limiter


@dataclass(slots=True)
class AskQuota:
    """One request's quota position, and the means to charge it."""

    plan: Plan
    limits: PlanLimits
    used: int
    #: False when metering is off for this request (kill switch, anonymous
    #: caller, or a usage-store outage). Capability checks still apply.
    metered: bool
    user_id: str
    store: UsageStore | None = None
    _committed: bool = False

    @property
    def remaining(self) -> int:
        return max(0, self.limits.daily_asks - self.used)

    def require_mode(self, mode: AskMode) -> None:
        """Reject a mode the caller's plan doesn't include."""
        if mode is AskMode.detailed and not self.limits.detailed_mode:
            raise PremiumRequiredError(
                "Detailed answers are part of TravelPia Premium.",
                meta={"feature": "detailed_mode", "plan": self.plan.value},
            )

    async def commit(self) -> None:
        """Charge one grounded answer. Idempotent within a request."""
        if not self.metered or self._committed or self.store is None:
            return
        self._committed = True
        try:
            self.used = await self.store.increment(self.user_id)
        except Exception:  # noqa: BLE001 — never fail a delivered answer
            # The answer has already been generated and is about to be
            # returned. Under-counting is the right direction to fail; keep
            # the echoed counter honest for this response either way.
            logger.warning(
                "usage increment failed for user=%s", self.user_id, exc_info=True
            )
            self.used += 1

    def state(self) -> QuotaState | None:
        """Client-facing quota snapshot, or None when metering is off."""
        if not self.metered:
            return None
        return QuotaState(
            plan=self.plan.value,
            limit=self.limits.daily_asks,
            remaining=self.remaining,
            resets_at=next_reset_at().isoformat(),
        )


def _unmetered(plan: Plan, limits: PlanLimits, user_id: str) -> AskQuota:
    return AskQuota(
        plan=plan, limits=limits, used=0, metered=False, user_id=user_id
    )


async def enforce_ask_quota(
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
    plans: PlanResolver = Depends(get_plan_resolver),
    usage: UsageStore = Depends(get_usage_store),
) -> AskQuota:
    """Resolve the caller's plan and allowance, rejecting them if exhausted."""
    # Kill switch, or a caller we cannot attribute usage to. Anonymous callers
    # arise while AUTH_REQUIRED is false — during the rollout, older app builds
    # send no token, and a shared counter would lock out everyone at once. Grant
    # full capability so behaviour matches today's shipped app exactly; the rate
    # limiter remains in force.
    if not settings.quota_enabled or user.is_anonymous:
        return _unmetered(
            Plan.free, limits_for(Plan.premium, settings), user.id
        )

    try:
        plan = await plans.get_plan(user.id)
    except Exception:  # noqa: BLE001
        # Fail *closed*: an entitlement outage must never grant premium.
        logger.warning(
            "plan lookup failed for user=%s; treating as free",
            user.id,
            exc_info=True,
        )
        plan = Plan.free

    limits = limits_for(plan, settings)

    try:
        used = await usage.get_today(user.id)
    except Exception:  # noqa: BLE001
        # Fail *open*: a usage-store blip must not take Ask down for paying
        # users. Capability limits from the resolved plan still apply, and the
        # rate limiter bounds the exposure. Alert on this log line.
        logger.warning(
            "usage lookup failed for user=%s; serving unmetered",
            user.id,
            exc_info=True,
        )
        return _unmetered(plan, limits, user.id)

    if used >= limits.daily_asks:
        raise QuotaExceededError(
            f"You've used all {limits.daily_asks} of today's questions.",
            meta={
                "plan": plan.value,
                "limit": limits.daily_asks,
                "remaining": 0,
                "resets_at": next_reset_at().isoformat(),
            },
        )

    return AskQuota(
        plan=plan,
        limits=limits,
        used=used,
        metered=True,
        user_id=user.id,
        store=usage,
    )


def _client_key(request: Request, user: User) -> str:
    """Limiter key: the user when known, else the client address.

    ``X-Forwarded-For`` is client-controlled and therefore spoofable. That is
    acceptable for an abuse fence — the durable per-user quota is what protects
    spend — but it is why this must not be used for anything billable.
    """
    if not user.is_anonymous:
        return f"user:{user.id}"
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    client = request.client
    return f"ip:{client.host if client else 'unknown'}"


async def enforce_rate_limit(
    request: Request,
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> None:
    """Reject callers making requests faster than the configured window allows."""
    if not settings.rate_limit_enabled:
        return
    status = await limiter.hit(_client_key(request, user))
    if not status.allowed:
        raise RateLimitError(meta={"retry_after": status.retry_after})
