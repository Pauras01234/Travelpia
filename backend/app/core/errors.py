"""Application error taxonomy.

Services raise these domain errors; a single set of exception handlers in
``main.py`` translates them into the :class:`ErrorResponse` envelope with the
right HTTP status. This keeps HTTP concerns out of the service layer.
"""

from __future__ import annotations


class AppError(Exception):
    """Base class for all handled application errors.

    Attributes
    ----------
    code:
        Stable, machine-readable identifier surfaced to clients.
    status_code:
        HTTP status the error maps to.
    detail:
        Human-readable, client-safe message.
    """

    code: str = "internal_error"
    status_code: int = 500
    detail: str = "An unexpected error occurred."

    def __init__(
        self,
        detail: str | None = None,
        *,
        meta: dict[str, object] | None = None,
    ) -> None:
        if detail is not None:
            self.detail = detail
        # Optional machine-readable context (quota state, retry hints). Kept
        # separate from `detail` so clients can act on it without parsing prose.
        self.meta = meta
        super().__init__(self.detail)


class ConfigurationError(AppError):
    """A required capability is not configured (e.g. missing API key)."""

    code = "service_unconfigured"
    status_code = 503
    detail = "This capability is not configured on the server."


class UpstreamServiceError(AppError):
    """A dependency (LLM, search, images) failed or timed out."""

    code = "upstream_unavailable"
    status_code = 502
    detail = "An upstream service is temporarily unavailable."


class NoResultsError(AppError):
    """No grounding information could be retrieved for the question."""

    code = "no_results"
    status_code = 404
    detail = "No results are available for that question right now."


class AuthError(AppError):
    """The request is missing or presents an invalid credential."""

    code = "unauthorized"
    status_code = 401
    detail = "Authentication is required."


class RateLimitError(AppError):
    """Too many requests in a short window — an abuse guard, not a quota.

    Transient by design: the client should retry after ``meta['retry_after']``
    seconds rather than treat this as a failure.
    """

    code = "rate_limited"
    status_code = 429
    detail = "You're sending requests faster than we can handle. Try again shortly."


class QuotaExceededError(AppError):
    """The caller has used their plan's daily allowance.

    Distinct from :class:`RateLimitError`: this is a product boundary the user
    is expected to reach, and the client renders it as an upgrade prompt.
    """

    code = "quota_exceeded"
    status_code = 429
    detail = "You've used today's questions."


class PremiumRequiredError(AppError):
    """The requested capability is not included in the caller's plan."""

    code = "premium_required"
    status_code = 403
    detail = "This feature is part of TravelPia Premium."
