"""Application settings — server-only secrets via environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from backend/ even if uvicorn's cwd is elsewhere.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server-only. Never expose these to the React Native app.
    supabase_url: str
    supabase_service_role_key: str


@lru_cache
def get_settings() -> Settings:
    return Settings()
