"""Subscription plans and the limits attached to them.

The plan *names* are a domain concept and live here; the *numbers* live in
:class:`~app.config.Settings` so they can be tuned per environment without a
deploy. Nothing outside this module should hard-code a limit — call
:func:`limits_for` instead.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.config import Settings


class Plan(str, Enum):
    """A user's entitlement tier."""

    free = "free"
    premium = "premium"

    @classmethod
    def coerce(cls, raw: object) -> "Plan":
        """Map a stored value onto a known plan, failing closed to ``free``.

        Anything unrecognised — ``None``, a typo, a tier added by a newer
        deployment — must never accidentally grant premium, so unknown values
        resolve to the least-privileged plan.
        """
        if isinstance(raw, cls):
            return raw
        try:
            return cls(str(raw).strip().lower())
        except (ValueError, AttributeError):
            return cls.free


@dataclass(frozen=True, slots=True)
class PlanLimits:
    """What a plan is allowed to do."""

    daily_asks: int
    detailed_mode: bool


def limits_for(plan: Plan, settings: Settings) -> PlanLimits:
    """Resolve the limits for ``plan`` from configuration."""
    if plan is Plan.premium:
        return PlanLimits(
            daily_asks=settings.premium_daily_asks,
            detailed_mode=True,
        )
    return PlanLimits(
        daily_asks=settings.free_daily_asks,
        detailed_mode=settings.free_detailed_mode,
    )
