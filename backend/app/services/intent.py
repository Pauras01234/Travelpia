"""Intent routing for Ask TravelPia.

Before spending a web search on every message, we ask a lightweight router:
does this message need grounded facts, or is it conversational (a greeting, an
acknowledgement like "okay/thanks", small talk, or a question about the
assistant itself)?

The router also *rewrites* the message into a standalone search query using the
conversation so far — so a follow-up like "what about food there?" becomes
"food in Galway Ireland" and retrieval actually works.

A single structured call returns everything:
    { "route": "chat" | "search",
      "reply": "<friendly reply, when route=chat>",
      "search_query": "<standalone query, when route=search>" }

If the model returns malformed JSON we fail safe to a search using the raw
message, so a router hiccup degrades to today's behaviour rather than breaking.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Protocol

from app.core.logging import get_logger
from app.schemas.ask import Turn
from app.services.llm import LLMClient

logger = get_logger(__name__)

_JSON_OBJECT = re.compile(r"\{.*\}", re.DOTALL)
_MAX_HISTORY_IN_PROMPT = 6
_ROUTER_MAX_TOKENS = 220


@dataclass(slots=True)
class RouteDecision:
    route: str  # "chat" | "search"
    reply: str
    search_query: str

    @property
    def is_chat(self) -> bool:
        return self.route == "chat"


class IntentRouter(Protocol):
    async def route(
        self, county: str, question: str, history: list[Turn]
    ) -> RouteDecision: ...


_SYSTEM = (
    "You are the intent router for TravelPia, a warm, knowledgeable local guide "
    "to Ireland. Look at the user's LATEST message in the context of the "
    "conversation and decide one of two routes:\n"
    "- \"chat\": greetings, thanks, acknowledgements (e.g. 'ok', 'cool'), small "
    "talk, or questions about you/the app. No web search needed.\n"
    "- \"search\": the user wants real information about places, food, events, "
    "activities, travel, history, etc. that benefits from up-to-date sources.\n\n"
    "Respond with ONLY a JSON object and nothing else:\n"
    '{"route":"chat"|"search","reply":"...","search_query":"..."}\n'
    "Rules:\n"
    "- If route is \"chat\": put a friendly, natural 1-2 sentence reply in "
    "\"reply\" (stay in character as a local Irish guide; gently invite a travel "
    "question). Leave \"search_query\" as \"\".\n"
    "- If route is \"search\": leave \"reply\" as \"\" and put a single, standalone "
    "web search query in \"search_query\". Resolve pronouns and references from "
    "the conversation, and include the county and 'Ireland'.\n"
    "- Never wrap the JSON in markdown or add commentary."
)


class LLMIntentRouter:
    """Router backed by the shared, provider-agnostic LLM client."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def route(
        self, county: str, question: str, history: list[Turn]
    ) -> RouteDecision:
        user_prompt = self._build_prompt(county, question, history)
        try:
            raw = await self._llm.generate(
                _SYSTEM, user_prompt, max_tokens=_ROUTER_MAX_TOKENS
            )
            return self._parse(raw, county, question)
        except Exception as exc:  # noqa: BLE001 - router must never hard-fail
            logger.warning("Intent router failed, defaulting to search: %s", exc)
            return self._fallback(county, question)

    def _build_prompt(
        self, county: str, question: str, history: list[Turn]
    ) -> str:
        lines = [f"County: {county}"]
        recent = history[-_MAX_HISTORY_IN_PROMPT:]
        if recent:
            lines.append("Conversation so far:")
            for turn in recent:
                who = "User" if turn.role.value == "user" else "TravelPia"
                lines.append(f"{who}: {turn.content}")
        lines.append(f"Latest user message: {question}")
        return "\n".join(lines)

    def _parse(self, raw: str, county: str, question: str) -> RouteDecision:
        match = _JSON_OBJECT.search(raw or "")
        if not match:
            return self._fallback(county, question)
        try:
            data = json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            return self._fallback(county, question)

        route = str(data.get("route", "")).strip().lower()
        reply = str(data.get("reply", "") or "").strip()
        search_query = str(data.get("search_query", "") or "").strip()

        if route == "chat":
            if not reply:
                reply = (
                    "Happy to help! Ask me anything about visiting "
                    f"{county} — places to go, food, or things to do."
                )
            return RouteDecision(route="chat", reply=reply, search_query="")

        # Anything not clearly "chat" is treated as a search (fail safe).
        if not search_query:
            search_query = self._default_query(county, question)
        return RouteDecision(route="search", reply="", search_query=search_query)

    def _fallback(self, county: str, question: str) -> RouteDecision:
        return RouteDecision(
            route="search",
            reply="",
            search_query=self._default_query(county, question),
        )

    @staticmethod
    def _default_query(county: str, question: str) -> str:
        return f"{question} {county} Ireland"
