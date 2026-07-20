"""Supabase service-role client (backend only)."""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """Return a service-role Supabase client. Never use the anon key server-side."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
