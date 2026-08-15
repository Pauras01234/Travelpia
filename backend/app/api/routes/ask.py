"""``POST /ask`` — the Ask TravelPia Q&A endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_rag_service
from app.core.logging import get_logger
from app.schemas.ask import AskRequest, AskResponse
from app.schemas.common import ErrorResponse
from app.security.auth import User, get_current_user
from app.security.limits import AskQuota, enforce_ask_quota, enforce_rate_limit
from app.services.rag import RagService

logger = get_logger(__name__)

router = APIRouter(tags=["ask"])


@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask a grounded travel question about an Irish county",
    responses={
        403: {"model": ErrorResponse, "description": "Plan does not include this"},
        404: {"model": ErrorResponse, "description": "No grounding results"},
        429: {"model": ErrorResponse, "description": "Rate limited or out of questions"},
        502: {"model": ErrorResponse, "description": "Upstream failure"},
        503: {"model": ErrorResponse, "description": "Service unconfigured"},
    },
    dependencies=[Depends(enforce_rate_limit)],
)
async def ask(
    payload: AskRequest,
    rag: RagService = Depends(get_rag_service),
    user: User = Depends(get_current_user),
    quota: AskQuota = Depends(enforce_ask_quota),
) -> AskResponse:
    """Answer a county-scoped question with cited sources and photos.

    The request body is validated against :class:`AskRequest` (county must be
    a real Irish county; question length is bounded). Authentication is
    enforced only when ``AUTH_REQUIRED`` is enabled.

    Metering: ``enforce_ask_quota`` rejects an exhausted caller before any
    upstream call is made, and only a *grounded* answer is charged — small
    talk, empty searches and upstream failures cost the user nothing.
    """
    quota.require_mode(payload.mode)

    response = await rag.answer(
        payload.county, payload.question, payload.mode, payload.history
    )

    if response.grounded:
        await quota.commit()

    logger.info(
        "ask: county=%s mode=%s user=%s plan=%s history=%d grounded=%s "
        "cached=%s remaining=%s q=%r",
        payload.county,
        payload.mode.value,
        user.id,
        quota.plan.value,
        len(payload.history),
        response.grounded,
        response.cached,
        quota.remaining if quota.metered else "n/a",
        payload.question[:80],
    )

    # Copy rather than mutate: `rag` caches the response object, and writing
    # one caller's quota onto it would leak that state to the next cache hit.
    return response.model_copy(update={"quota": quota.state()})
