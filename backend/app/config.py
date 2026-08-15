"""Application configuration.

All runtime configuration is read from the environment (or a local ``.env``
file) exactly once and validated by pydantic. Nothing else in the codebase
should read ``os.environ`` directly — inject ``Settings`` instead. This keeps
configuration typed, testable, and documented in a single place.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LLMProvider = Literal["openai", "anthropic"]


class Settings(BaseSettings):
    """Typed application settings, sourced from environment variables.

    Field names map to upper-cased env vars (e.g. ``openai_api_key`` reads
    ``OPENAI_API_KEY``), matching the conventions already used by the
    prototype and the architecture document.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Meta -------------------------------------------------------------
    app_name: str = "TravelPia API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    # Comma-separated list of allowed CORS origins. "*" allows all (dev only).
    cors_origins: str = "*"

    # --- LLM --------------------------------------------------------------
    llm_provider: LLMProvider = "openai"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    # Default model is provider-appropriate; overridable via LLM_MODEL.
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.45
    llm_timeout_seconds: float = 30.0
    llm_max_tokens_fast: int = 350
    llm_max_tokens_detailed: int = 700

    # --- Search (Serper) --------------------------------------------------
    serper_api_key: str = ""
    serper_country: str = "ie"
    serper_lang: str = "en"
    search_results_fast: int = 6
    search_results_detailed: int = 10

    # --- Images (Unsplash) ------------------------------------------------
    unsplash_access_key: str = ""
    images_default_limit: int = 6
    images_max_limit: int = 24

    # --- Networking / caching --------------------------------------------
    http_timeout_seconds: float = 8.0
    cache_ttl_seconds: int = 1200

    # --- Plans & quota ----------------------------------------------------
    # Daily allowance of *grounded* answers per plan. Conversational replies
    # and no-result answers are never charged (see security/limits.py).
    free_daily_asks: int = 5
    # Premium is marketed as unlimited but capped as fraud protection: one
    # compromised account on a truly uncapped plan is an open-ended bill.
    premium_daily_asks: int = 200
    # Detailed mode costs ~2x the output tokens and ~1.7x the search results,
    # so it is a premium capability by default.
    free_detailed_mode: bool = False
    # Kill switch: disables metering entirely without a deploy. Use if the
    # usage store misbehaves in production.
    quota_enabled: bool = True
    # How long a resolved plan is cached. Bounds how long an upgrade takes to
    # take effect; keep short.
    plan_cache_ttl_seconds: int = 60

    # --- Rate limiting (abuse guard, distinct from the quota) -------------
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 20
    rate_limit_window_seconds: int = 60

    # --- Auth (Supabase JWT) — pluggable seam ----------------------------
    # When False (default for Core-5 parallel dev) the API accepts anonymous
    # requests. Dev C flips this to True once Supabase auth is live; no other
    # code changes are required.
    auth_required: bool = False
    supabase_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    # Optional explicit JWKS URL; if empty it is derived from supabase_url.
    supabase_jwks_url: str = ""
    # Service-role key — backend only, used by the /auth login/logout routes to
    # talk to Supabase Auth and the profiles table. Never expose to the client.
    supabase_service_role_key: str = ""

    @field_validator("cors_origins")
    @classmethod
    def _strip_origins(cls, v: str) -> str:
        return v.strip()

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins as a list. ``["*"]`` when wildcard is configured."""
        raw = self.cors_origins.strip()
        if raw in ("", "*"):
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def resolved_jwks_url(self) -> str:
        """The JWKS endpoint used to verify Supabase-issued JWTs."""
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_url:
            base = self.supabase_url.rstrip("/")
            return f"{base}/auth/v1/.well-known/jwks.json"
        return ""

    @property
    def llm_configured(self) -> bool:
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        return False


@lru_cache
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance.

    Cached so the ``.env`` file and environment are parsed once per process.
    Tests can clear the cache via ``get_settings.cache_clear()``.
    """
    return Settings()
