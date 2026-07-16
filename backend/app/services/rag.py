"""RAG orchestration for the Ask TravelPia feature.

Pipeline:
    1. Retrieve grounding snippets + sources (search, with Wikipedia fallback).
    2. Concurrently: generate the grounded answer AND fetch gallery images.
       Images don't depend on the answer text, so we don't serialise them —
       this overlaps the two slowest network calls and roughly halves latency.
    3. Assemble the frozen {answer, sources, images} response.

The prompt is engineered to fix the prototype's "prompt-echo" bug: the model
is told to answer directly and never restate the county/question scaffolding,
and we defensively strip any echoed scaffolding that slips through.
"""

from __future__ import annotations

import asyncio
import re

from app.config import Settings
from app.core.cache import TTLCache
from app.core.errors import NoResultsError
from app.core.logging import get_logger
from app.schemas.ask import AskMode, AskResponse, Image, Source
from app.services.images import ImageService
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
    "Answer the user's question about the given county using ONLY the "
    "information provided as context. If the context is insufficient, say so "
    "briefly and suggest what you can help with instead — never invent "
    "specific places, prices, or facts. "
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


class RagService:
    """Coordinates search, generation, and image retrieval for /ask."""

    def __init__(
        self,
        settings: Settings,
        search: SearchService,
        images: ImageService,
        llm: LLMClient,
        response_cache: TTLCache[AskResponse],
    ) -> None:
        self._settings = settings
        self._search = search
        self._images = images
        self._llm = llm
        self._cache = response_cache

    async def answer(
        self, county: str, question: str, mode: AskMode
    ) -> AskResponse:
        cache_key = f"ask::{mode.value}::{county.lower()}::{question.lower()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            # Return a copy flagged as cached without mutating the stored one.
            return cached.model_copy(update={"cached": True})

        query = f"{question} {county} Ireland"
        n = (
            self._settings.search_results_detailed
            if mode is AskMode.detailed
            else self._settings.search_results_fast
        )
        search_result = await self._search.search(query, limit=n)

        if not search_result.has_content:
            raise NoResultsError(
                "I couldn't find reliable information for that just now. "
                "Try rephrasing, or ask about something else in "
                f"{county}."
            )

        # Answer generation and image search are independent → run together.
        system_prompt, user_prompt = self._build_prompt(
            county, question, search_result.snippets, mode
        )
        max_tokens = (
            self._settings.llm_max_tokens_detailed
            if mode is AskMode.detailed
            else self._settings.llm_max_tokens_fast
        )

        answer_text, images = await asyncio.gather(
            self._llm.generate(system_prompt, user_prompt, max_tokens),
            self._images.search(
                f"{question} {county} Ireland",
                limit=self._settings.images_default_limit,
            ),
        )

        answer_text = self._sanitise(answer_text)
        response = AskResponse(
            answer=answer_text,
            sources=self._top_sources(search_result.sources),
            images=images,
            county=county,
            mode=mode,
            grounded=bool(search_result.sources),
            cached=False,
        )
        await self._cache.set(cache_key, response)
        return response

    # -- prompt construction ---------------------------------------------
    def _build_prompt(
        self,
        county: str,
        question: str,
        snippets: list[str],
        mode: AskMode,
    ) -> tuple[str, str]:
        context = " ".join(snippets)[: _CONTEXT_BUDGET[mode]]
        system_prompt = f"{_SYSTEM_BASE} {_LENGTH_RULES[mode]}"
        user_prompt = (
            f"County: {county}\n"
            f"Question: {question}\n\n"
            f"Context:\n{context}"
        )
        return system_prompt, user_prompt

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
