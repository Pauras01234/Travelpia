"""RAG orchestration for the Ask TravelPia feature.

Pipeline:
    1. Route the message (intent). Conversational messages ("okay", "thanks",
       greetings, small talk) get a warm reply with NO search — so the app
       feels like a chat, not a search box. The router also rewrites the
       message into a standalone, context-resolved search query.
    2. For search-worthy messages: retrieve grounding snippets + sources.
    3. Concurrently generate the grounded answer AND fetch gallery images
       (they don't depend on each other), then assemble the response.

The prompt is engineered to fix the prototype's "prompt-echo" bug and to use
the recent conversation for context (follow-ups, pronouns).
"""

from __future__ import annotations

import asyncio
import re

from app.config import Settings
from app.core.cache import TTLCache
from app.core.logging import get_logger
from app.schemas.ask import AskMode, AskResponse, Source, Turn
from app.services.images import ImageService
from app.services.intent import IntentRouter
from app.services.llm import LLMClient
from app.services.search import SearchService

logger = get_logger(__name__)

# Matches echoed scaffolding like "County: Galway" / "Question: ..." that some
# models prepend despite instructions.
_ECHO_PREFIX = re.compile(
    r"^\s*(county|question|answer)\s*:\s.*?$",
    flags=re.IGNORECASE | re.MULTILINE,
)

_SYSTEM_BASE = (
    "You are TravelPia, a warm, knowledgeable local guide to Ireland. "
    "Answer the user's latest question about the given county using ONLY the "
    "information provided as context, taking the recent conversation into "
    "account for follow-ups. If the context is insufficient, say so briefly "
    "and suggest what you can help with instead — never invent specific "
    "places, prices, or facts. "
    "Answer directly in a friendly, second-person voice. Do NOT restate the "
    "county or the question, and do NOT prefix your reply with labels like "
    "'Answer:'."
)

_LENGTH_RULES = {
    AskMode.fast: "Keep it concise: 3–5 sentences.",
    AskMode.detailed: (
        "Give a thorough answer of at least 6 sentences, weaving in specific "
        "names, places, and practical tips wherever the context supports them."
    ),
}

_CONTEXT_BUDGET = {AskMode.fast: 2000, AskMode.detailed: 3500}
_MAX_HISTORY_IN_PROMPT = 6


class RagService:
    """Coordinates routing, search, generation, and images for /ask."""

    def __init__(
        self,
        settings: Settings,
        search: SearchService,
        images: ImageService,
        llm: LLMClient,
        router: IntentRouter,
        response_cache: TTLCache[AskResponse],
    ) -> None:
        self._settings = settings
        self._search = search
        self._images = images
        self._llm = llm
        self._router = router
        self._cache = response_cache

    async def answer(
        self,
        county: str,
        question: str,
        mode: AskMode,
        history: list[Turn] | None = None,
    ) -> AskResponse:
        history = history or []

        # 1. Route: is this small talk, or a real information need?
        decision = await self._router.route(county, question, history)
        if decision.is_chat:
            # Conversational reply — no search, no sources, never cached (we
            # want varied, context-aware replies).
            return AskResponse(
                answer=decision.reply,
                sources=[],
                images=[],
                county=county,
                mode=mode,
                grounded=False,
                cached=False,
            )

        query = decision.search_query
        # Only cache first-turn queries; follow-ups are context-dependent.
        use_cache = not history
        cache_key = f"ask::{mode.value}::{county.lower()}::{query.lower()}"
        if use_cache:
            cached = await self._cache.get(cache_key)
            if cached is not None:
                return cached.model_copy(update={"cached": True})

        n = (
            self._settings.search_results_detailed
            if mode is AskMode.detailed
            else self._settings.search_results_fast
        )
        search_result = await self._search.search(query, limit=n)

        if not search_result.has_content:
            # Soft, in-conversation reply rather than a hard error — reads as a
            # natural "I couldn't find that" turn instead of an error card.
            return AskResponse(
                answer=(
                    "I couldn't find anything reliable on that just now. Try "
                    f"rephrasing, or ask me something else about {county} — "
                    "places to visit, food, or things to do."
                ),
                sources=[],
                images=[],
                county=county,
                mode=mode,
                grounded=False,
                cached=False,
            )

        # 2. Answer generation and image search are independent → run together.
        system_prompt, user_prompt = self._build_prompt(
            county, question, search_result.snippets, mode, history
        )
        max_tokens = (
            self._settings.llm_max_tokens_detailed
            if mode is AskMode.detailed
            else self._settings.llm_max_tokens_fast
        )

        answer_text, images = await asyncio.gather(
            self._llm.generate(system_prompt, user_prompt, max_tokens),
            self._images.search(query, limit=self._settings.images_default_limit),
        )

        response = AskResponse(
            answer=self._sanitise(answer_text),
            sources=self._top_sources(search_result.sources),
            images=images,
            county=county,
            mode=mode,
            grounded=bool(search_result.sources),
            cached=False,
        )
        if use_cache:
            await self._cache.set(cache_key, response)
        return response

    # -- prompt construction ---------------------------------------------
    def _build_prompt(
        self,
        county: str,
        question: str,
        snippets: list[str],
        mode: AskMode,
        history: list[Turn],
    ) -> tuple[str, str]:
        context = " ".join(snippets)[: _CONTEXT_BUDGET[mode]]
        system_prompt = f"{_SYSTEM_BASE} {_LENGTH_RULES[mode]}"

        parts = [f"County: {county}"]
        recent = history[-_MAX_HISTORY_IN_PROMPT:]
        if recent:
            parts.append("Conversation so far:")
            for turn in recent:
                who = "User" if turn.role.value == "user" else "TravelPia"
                parts.append(f"{who}: {turn.content}")
        parts.append(f"Question: {question}")
        parts.append(f"\nContext:\n{context}")
        return system_prompt, "\n".join(parts)

    @staticmethod
    def _sanitise(text: str) -> str:
        """Strip echoed prompt scaffolding the model may have prepended."""
        cleaned = _ECHO_PREFIX.sub("", text).strip()
        return cleaned or text.strip()

    @staticmethod
    def _top_sources(sources: list[Source], limit: int = 3) -> list[Source]:
        # De-duplicate by URL, preserving order, and cap the count.
        seen: set[str] = set()
        unique: list[Source] = []
        for s in sources:
            if s.url in seen:
                continue
            seen.add(s.url)
            unique.append(s)
            if len(unique) >= limit:
                break
        return unique
