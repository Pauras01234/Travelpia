"""Per-request context (request id) propagated via a context variable.

A context variable lets logging attach the current request id without
threading it through every function signature.
"""

from __future__ import annotations

from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def get_request_id() -> str:
    return request_id_ctx.get()
