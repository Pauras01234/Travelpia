"""``POST /ask`` — the Ask TravelPia Q&A endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_rag_service
from app.core.logging import get_logger
from app.schemas.ask import AskRequest, AskResponse
from app.schemas.common import ErrorResponse
from app.security.auth import User, get_current_user
from app.services.rag import RagService

logger = get_logger(__name__)

router = APIRouter(tags=["ask"])


@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask a grounded travel question about an Irish county",
    responses={
        404: {"model": ErrorResponse, "description": "No grounding results"},
        502: {"model": ErrorResponse, "description": "Upstream failure"},
        503: {"model": ErrorResponse, "description": "Service unconfigured"},
    },
)
async def ask(
    payload: AskRequest,
    rag: RagService = Depends(get_rag_service),
    user: User = Depends(get_current_user),
) -> AskResponse:
    """Answer a county-scoped question with cited sources and photos.

    The request body is validated against :class:`AskRequest` (county must be
    a real Irish county; question length is bounded). Authentication is
    enforced only when ``AUTH_REQUIRED`` is enabled.
    """
    logger.info(
        "ask: county=%s mode=%s user=%s q=%r",
        payload.county,
        payload.mode.value,
        user.id,
        payload.question[:80],
    )
    return await rag.answer(payload.county, payload.question, payload.mode)
