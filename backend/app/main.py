"""Application factory and wiring.

Owns process-wide concerns: lifespan (shared HTTP client, caches, LLM client),
CORS, request-id middleware, and the exception handlers that turn domain
errors and validation failures into the uniform :class:`ErrorResponse`.
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import ask, health, images, places
from app.routers import auth
from app.config import Settings, get_settings
from app.core.cache import TTLCache
from app.core.context import request_id_ctx
from app.core.errors import AppError
from app.core.logging import configure_logging, get_logger
from app.schemas.ask import AskResponse
from app.schemas.common import ErrorResponse
from app.services.llm import build_llm_client
from app.services.search import SearchResult

logger = get_logger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create shared resources on startup; dispose of them on shutdown."""
    settings: Settings = get_settings()
    configure_logging(settings.log_level)

    app.state.settings = settings
    app.state.http_client = httpx.AsyncClient(
        timeout=settings.http_timeout_seconds,
        headers={"User-Agent": f"{settings.app_name}/{settings.app_version}"},
    )
    app.state.search_cache = TTLCache[SearchResult](settings.cache_ttl_seconds)
    app.state.image_cache = TTLCache(settings.cache_ttl_seconds)
    app.state.response_cache = TTLCache[AskResponse](settings.cache_ttl_seconds)
    app.state.places_cache = TTLCache(settings.cache_ttl_seconds)

    # Build the LLM client eagerly so misconfiguration surfaces at startup in
    # logs (not as a per-request surprise). If unconfigured, the /ask route
    # returns a clear 503 and readiness reports "degraded".
    try:
        app.state.llm_client = build_llm_client(settings)
        logger.info(
            "LLM provider '%s' ready (model=%s)",
            settings.llm_provider,
            settings.llm_model,
        )
    except Exception as exc:  # noqa: BLE001
        app.state.llm_client = None
        logger.warning("LLM not configured: %s", exc)

    logger.info(
        "%s v%s started (env=%s, auth_required=%s)",
        settings.app_name,
        settings.app_version,
        settings.environment,
        settings.auth_required,
    )
    try:
        yield
    finally:
        await app.state.http_client.aclose()
        client = getattr(app.state, "llm_client", None)
        if client is not None:
            await client.aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _register_middleware(app)
    _register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(ask.router)
    app.include_router(images.router)
    app.include_router(places.router)
    app.include_router(auth.router)
    return app


def _register_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context(request: Request, call_next):
        # Honour an inbound request id (for tracing across services) or mint one.
        req_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex[:12]
        token = request_id_ctx.set(req_id)
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers[REQUEST_ID_HEADER] = req_id
        return response


def _error_response(status_code: int, code: str, detail: str) -> JSONResponse:
    body = ErrorResponse(
        error=code, detail=detail, request_id=request_id_ctx.get()
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error("%s: %s", exc.code, exc.detail)
        return _error_response(exc.status_code, exc.code, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Surface the first validation message; keep it client-safe.
        first = exc.errors()[0] if exc.errors() else {}
        detail = first.get("msg", "Invalid request.")
        return _error_response(422, "validation_error", detail)

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error: %s", exc)
        return _error_response(
            500, "internal_error", "An unexpected error occurred."
        )


app = create_app()
