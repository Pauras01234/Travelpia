"""``GET /images`` — server-side Unsplash proxy (keeps the key private)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_image_service
from app.config import Settings, get_settings
from app.schemas.ask import ImagesResponse
from app.security.auth import User, get_current_user
from app.security.limits import enforce_rate_limit
from app.services.images import ImageService

router = APIRouter(tags=["images"])


@router.get(
    "/images",
    response_model=ImagesResponse,
    summary="Search landscape photos for a query",
    dependencies=[Depends(enforce_rate_limit)],
)
async def images(
    query: str = Query(..., min_length=2, max_length=120),
    limit: int | None = Query(default=None, ge=1, le=24),
    service: ImageService = Depends(get_image_service),
    settings: Settings = Depends(get_settings),
    _user: User = Depends(get_current_user),
) -> ImagesResponse:
    result = await service.search(
        query, limit=limit or settings.images_default_limit
    )
    return ImagesResponse(images=result)
