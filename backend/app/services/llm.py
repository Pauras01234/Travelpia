"""Provider-agnostic text generation.

This module is the single choke point for LLM calls. To switch providers
(OpenAI -> Anthropic/Gemini) you implement a new :class:`LLMClient` and select
it in :func:`build_llm_client` — nothing else in the app changes, because
callers depend only on the abstract ``generate`` method.

The client is async (non-blocking) and retries transient upstream failures.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import Settings
from app.core.errors import ConfigurationError, UpstreamServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMClient(ABC):
    """Abstract text-generation client."""

    @abstractmethod
    async def generate(
        self, system_prompt: str, user_prompt: str, max_tokens: int
    ) -> str:
        """Return generated text, or raise :class:`UpstreamServiceError`."""

    async def aclose(self) -> None:  # pragma: no cover - optional lifecycle
        """Release any underlying resources."""


class OpenAIClient(LLMClient):
    """OpenAI-backed implementation using the async SDK client."""

    # Retry only on transient errors; a bad request is not retried.
    _RETRYABLE: tuple[type[Exception], ...]

    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise ConfigurationError(
                "The travel assistant is not configured "
                "(missing OPENAI_API_KEY)."
            )
        # Imported lazily so the package imports even if the SDK is absent.
        from openai import (
            APIConnectionError,
            APITimeoutError,
            AsyncOpenAI,
            InternalServerError,
            RateLimitError,
        )

        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.llm_timeout_seconds,
        )
        self._model = settings.llm_model
        self._temperature = settings.llm_temperature
        self._RETRYABLE = (
            APIConnectionError,
            APITimeoutError,
            RateLimitError,
            InternalServerError,
        )

    async def generate(
        self, system_prompt: str, user_prompt: str, max_tokens: int
    ) -> str:
        @retry(
            reraise=True,
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, max=4),
            retry=retry_if_exception_type(self._RETRYABLE),
        )
        async def _call() -> str:
            resp = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self._temperature,
                max_tokens=max_tokens,
            )
            return (resp.choices[0].message.content or "").strip()

        try:
            return await _call()
        except self._RETRYABLE as exc:
            logger.warning("LLM transient failure after retries: %s", exc)
            raise UpstreamServiceError(
                "The assistant is busy right now. Please try again."
            ) from exc
        except Exception as exc:  # noqa: BLE001 - convert to domain error
            logger.exception("LLM call failed")
            raise UpstreamServiceError(
                "Sorry, I couldn't generate an answer right now."
            ) from exc

    async def aclose(self) -> None:
        await self._client.close()


class AnthropicClient(LLMClient):
    """Anthropic-backed implementation (enabled via LLM_PROVIDER=anthropic)."""

    def __init__(self, settings: Settings) -> None:
        if not settings.anthropic_api_key:
            raise ConfigurationError(
                "The travel assistant is not configured "
                "(missing ANTHROPIC_API_KEY)."
            )
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise ConfigurationError(
                "LLM_PROVIDER=anthropic requires the 'anthropic' package."
            ) from exc

        self._client = AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=settings.llm_timeout_seconds,
        )
        self._model = settings.llm_model
        self._temperature = settings.llm_temperature

    async def generate(
        self, system_prompt: str, user_prompt: str, max_tokens: int
    ) -> str:
        try:
            msg = await self._client.messages.create(
                model=self._model,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                max_tokens=max_tokens,
                temperature=self._temperature,
            )
            parts = [b.text for b in msg.content if getattr(b, "type", "") == "text"]
            return "".join(parts).strip()
        except Exception as exc:  # noqa: BLE001 - convert to domain error
            logger.exception("Anthropic call failed")
            raise UpstreamServiceError(
                "Sorry, I couldn't generate an answer right now."
            ) from exc

    async def aclose(self) -> None:
        await self._client.close()


def build_llm_client(settings: Settings) -> LLMClient:
    """Factory: return the configured provider's client.

    Raises :class:`ConfigurationError` if the selected provider lacks a key,
    which the API surfaces as a clear 503 rather than a 500.
    """
    if settings.llm_provider == "anthropic":
        return AnthropicClient(settings)
    return OpenAIClient(settings)
