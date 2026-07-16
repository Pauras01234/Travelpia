"""Authentication seam — Supabase JWT verification.

Per the architecture, identity is a single Supabase-issued JWT verified here
against Supabase's JWKS (no session state in FastAPI). During Core-5 parallel
development ``AUTH_REQUIRED`` is False, so the API accepts anonymous callers
and the mobile app can integrate immediately. When Dev C ships Supabase auth,
flipping ``AUTH_REQUIRED=true`` (and setting ``SUPABASE_URL``) enforces
verification with no other code changes.
"""

from __future__ import annotations

from functools import lru_cache

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.core.errors import AuthError, ConfigurationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# auto_error=False: we raise our own typed AuthError so the response uses the
# shared error envelope rather than FastAPI's default 403 body.
_bearer = HTTPBearer(auto_error=False)


class User(BaseModel):
    """The authenticated principal for a request."""

    id: str
    email: str | None = None
    is_anonymous: bool = False


ANONYMOUS = User(id="anonymous", is_anonymous=True)


@lru_cache
def _jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    # Cached per URL; PyJWKClient caches signing keys internally.
    return jwt.PyJWKClient(jwks_url)


def _verify_token(token: str, settings: Settings) -> User:
    jwks_url = settings.resolved_jwks_url
    if not jwks_url:
        raise ConfigurationError(
            "AUTH_REQUIRED is set but SUPABASE_URL/JWKS is not configured."
        )
    try:
        signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience=settings.supabase_jwt_audience,
        )
    except jwt.PyJWTError as exc:
        logger.info("JWT verification failed: %s", exc)
        raise AuthError("Invalid or expired authentication token.") from exc

    subject = claims.get("sub")
    if not subject:
        raise AuthError("Authentication token is missing a subject.")
    return User(id=subject, email=claims.get("email"), is_anonymous=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> User:
    """Resolve the request principal.

    - Auth disabled  -> anonymous user (Core-5 default).
    - Auth enabled   -> verify the Bearer JWT or raise 401.
    """
    if not settings.auth_required:
        return ANONYMOUS

    if credentials is None or not credentials.credentials:
        raise AuthError("Missing bearer token.")
    user = _verify_token(credentials.credentials, settings)
    # Make the principal available to logging/handlers if needed.
    request.state.user = user
    return user
