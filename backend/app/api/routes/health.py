"""Health and readiness probes (unauthenticated)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.config import Settings, get_settings
from app.schemas.common import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.environment,
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness probe — reports which capabilities are configured",
)
async def ready(
    request: Request, settings: Settings = Depends(get_settings)
) -> ReadinessResponse:
    checks = {
        "llm": getattr(request.app.state, "llm_client", None) is not None,
        "search": bool(settings.serper_api_key),
        # Images + places now use Serper (Google Images), not Unsplash.
        "images": bool(settings.serper_api_key),
    }
    # "search" is the only hard dependency for a useful answer; images and a
    # configured LLM are checked too. Ready if the LLM is available.
    status = "ok" if checks["llm"] else "degraded"
    return ReadinessResponse(status=status, checks=checks)
