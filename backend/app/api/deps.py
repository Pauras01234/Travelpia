"""FastAPI dependency providers.

Shared, expensive resources (the HTTP client, caches, the LLM client) live on
``app.state`` and are created once in the lifespan handler. Services are
lightweight wrappers assembled per-request from those resources, which keeps
handlers declarative and makes everything trivial to override in tests.
"""

from __future__ import annotations

from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.core.cache import TTLCache
from app.core.errors import ConfigurationError
from app.schemas.ask import AskResponse
from app.services.images import ImageService
from app.services.intent import IntentRouter, LLMIntentRouter
from app.services.llm import LLMClient
from app.services.places import PlacesService
from app.services.rag import RagService
from app.services.search import SearchService


def get_response_cache(request: Request) -> TTLCache[AskResponse]:
    return request.app.state.response_cache


def get_places_service(
    request: Request, settings: Settings = Depends(get_settings)
) -> PlacesService:
    state = request.app.state
    return PlacesService(settings, state.http_client, state.places_cache)


def get_search_service(
    request: Request, settings: Settings = Depends(get_settings)
) -> SearchService:
    state = request.app.state
    return SearchService(settings, state.http_client, state.search_cache)


def get_image_service(
    request: Request, settings: Settings = Depends(get_settings)
) -> ImageService:
    state = request.app.state
    return ImageService(settings, state.http_client, state.image_cache)


def get_llm_client(request: Request) -> LLMClient:
    client = getattr(request.app.state, "llm_client", None)
    if client is None:
        # LLM not configured at startup -> clear, actionable 503.
        raise ConfigurationError(
            "The travel assistant is not configured on the server."
        )
    return client


def get_intent_router(
    llm: LLMClient = Depends(get_llm_client),
) -> IntentRouter:
    return LLMIntentRouter(llm)


def get_rag_service(
    settings: Settings = Depends(get_settings),
    search: SearchService = Depends(get_search_service),
    images: ImageService = Depends(get_image_service),
    llm: LLMClient = Depends(get_llm_client),
    router: IntentRouter = Depends(get_intent_router),
    places: PlacesService = Depends(get_places_service),
    response_cache: TTLCache[AskResponse] = Depends(get_response_cache),
) -> RagService:
    return RagService(
        settings=settings,
        search=search,
        images=images,
        llm=llm,
        router=router,
        places=places,
        response_cache=response_cache,
    )
