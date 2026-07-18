"""Request/response schemas for the Ask TravelPia (Q&A) feature.

These models *are* the interface contract from the architecture doc (section
4.2). They are validated at the edge so handlers and services only ever deal
with well-formed data. Field names and shapes are frozen — the mobile app is
built against them — so change them deliberately and version if breaking.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.counties import normalise_county


class AskMode(str, Enum):
    """Answer depth. Maps to the Fast/Detailed toggle in the design."""

    fast = "fast"
    detailed = "detailed"


class Role(str, Enum):
    """Author of a conversation turn."""

    user = "user"
    assistant = "assistant"


class Turn(BaseModel):
    """One prior message, used to give the assistant short-term memory."""

    role: Role
    content: str = Field(..., min_length=1, max_length=4000)


# Only the most recent turns are worth sending; cap to bound cost/latency.
MAX_HISTORY_TURNS = 10


class Source(BaseModel):
    """A cited web source backing the answer."""

    title: str
    url: str


class Image(BaseModel):
    """A single gallery image with attribution (Unsplash requires credit)."""

    url: str
    alt: str = ""
    credit: str = ""


class AskRequest(BaseModel):
    """Inbound payload for ``POST /ask``."""

    model_config = ConfigDict(str_strip_whitespace=True)

    county: str = Field(..., description="One of the 32 counties of Ireland.")
    question: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The user's latest free-text message.",
    )
    mode: AskMode = Field(
        default=AskMode.fast,
        description="Answer depth: 'fast' (concise) or 'detailed' (thorough).",
    )
    history: list[Turn] = Field(
        default_factory=list,
        description="Prior conversation turns, oldest first, for context.",
    )

    @field_validator("history")
    @classmethod
    def _cap_history(cls, v: list[Turn]) -> list[Turn]:
        # Keep only the most recent turns; ignore anything older.
        return v[-MAX_HISTORY_TURNS:]

    @field_validator("county")
    @classmethod
    def _validate_county(cls, v: str) -> str:
        canonical = normalise_county(v)
        if canonical is None:
            raise ValueError(
                "county must be one of the 32 counties of Ireland"
            )
        return canonical

    @field_validator("question")
    @classmethod
    def _non_empty_question(cls, v: str) -> str:
        # min_length is checked before stripping edge cases like "   ".
        if not v.strip():
            raise ValueError("question must not be blank")
        return v


class AskResponse(BaseModel):
    """Outbound payload for ``POST /ask`` — the frozen contract shape."""

    answer: str
    sources: list[Source] = Field(default_factory=list)
    images: list[Image] = Field(default_factory=list)

    # Non-contract-breaking metadata (additive fields the client may ignore).
    county: str
    mode: AskMode
    grounded: bool = Field(
        default=False,
        description="True when the answer is backed by retrieved sources.",
    )
    cached: bool = Field(
        default=False,
        description="True when served from the response cache.",
    )


class ImagesResponse(BaseModel):
    """Outbound payload for ``GET /images``."""

    images: list[Image] = Field(default_factory=list)
