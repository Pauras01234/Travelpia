"""Schemas for the Map places search (`GET /places`)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class MapPlace(BaseModel):
    """A real-world place with coordinates, for dropping a map pin."""

    id: str
    name: str
    address: str = ""
    lat: float
    lng: float
    rating: float | None = None
    rating_count: int | None = None
    category: str = ""
    price_level: str = ""


class PlacesResponse(BaseModel):
    places: list[MapPlace] = Field(default_factory=list)


class PlacePhotoResponse(BaseModel):
    """A representative photo URL for a place (or null if none found)."""

    url: str | None = None
