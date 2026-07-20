"""Supabase service-role client (backend only)."""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


def _new_service_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase() -> Client:
    """Return a shared service-role Supabase client. Never use the anon key server-side.

    Do not call sign_in_with_password on this client — that stores a user JWT and
    breaks subsequent auth.admin.* calls (AuthApiError: User not allowed / not_admin).
    Use create_auth_client() for password grants instead.
    """
    return _new_service_client()


def create_auth_client() -> Client:
    """Fresh service-role client for password grants (not the shared admin client)."""
    return _new_service_client()
