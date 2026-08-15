"""``GET /places`` — search real places for the Map (Serper proxy)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_places_service
from app.schemas.places import PlacePhotoResponse, PlacesResponse
from app.security.auth import User, get_current_user
from app.security.limits import enforce_rate_limit
from app.services.places import PlacesService

router = APIRouter(tags=["places"])


@router.get(
    "/places",
    response_model=PlacesResponse,
    summary="Search real places (with coordinates) for the map",
    dependencies=[Depends(enforce_rate_limit)],
)
async def places(
    query: str = Query(..., min_length=1, max_length=120),
    county: str = Query(default="", max_length=40),
    limit: int = Query(default=20, ge=1, le=30),
    service: PlacesService = Depends(get_places_service),
    _user: User = Depends(get_current_user),
) -> PlacesResponse:
    results = await service.search(query, county, limit)
    return PlacesResponse(places=results)


@router.get(
    "/places/photo",
    response_model=PlacePhotoResponse,
    summary="Get a representative photo URL for a place",
    dependencies=[Depends(enforce_rate_limit)],
)
async def place_photo(
    query: str = Query(..., min_length=1, max_length=160),
    service: PlacesService = Depends(get_places_service),
    _user: User = Depends(get_current_user),
) -> PlacePhotoResponse:
    return PlacePhotoResponse(url=await service.photo(query))
