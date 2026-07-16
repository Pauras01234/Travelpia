"""Shared schemas: error envelope and health payloads."""

from __future__ import annotations

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Uniform error envelope returned for every handled failure."""

    error: str  # stable machine-readable code, e.g. "upstream_unavailable"
    detail: str  # human-readable explanation, safe to surface to the client
    request_id: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class ReadinessResponse(BaseModel):
    status: str
    checks: dict[str, bool]
