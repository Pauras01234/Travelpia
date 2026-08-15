"""Authentication seam — Supabase JWT verification.

Per the architecture, identity is a single Supabase-issued JWT verified here
against Supabase's JWKS (no session state in FastAPI).

``AUTH_REQUIRED`` controls *enforcement*, not *identification*. While it is
False the API still accepts anonymous callers, but a request that does carry a
token is identified anyway ("soft auth") so per-account metering works for
updated clients before the flag is flipped. Setting ``AUTH_REQUIRED=true`` (with
``SUPABASE_URL``) then rejects anonymous callers, with no other code changes.
"""

from __future__ import annotations

from functools import lru_cache

import jwt
from anyio import to_thread
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

    Three states, not two:

    - ``AUTH_REQUIRED`` on            -> a valid Bearer JWT, or 401.
    - off, token present ("soft auth") -> verify it and identify the caller.
    - off, no token                    -> anonymous.

    The middle state is what makes a staged rollout possible: updated apps are
    identified (and therefore metered per account) while older builds, which
    send no token, keep working untouched.
    """
    token = credentials.credentials if credentials else ""

    if settings.auth_required:
        if not token:
            raise AuthError("Missing bearer token.")
        user = await _resolve_token(token, settings)
        # Make the principal available to logging/handlers if needed.
        request.state.user = user
        return user

    if token:
        try:
            user = await _resolve_token(token, settings)
        except (AuthError, ConfigurationError) as exc:
            # Must NOT 401 here: the route is open in this mode, so an
            # unverifiable token degrades to anonymous rather than failing a
            # request that would have succeeded with no token at all.
            logger.info("Soft auth: ignoring unverifiable token (%s)", exc)
        else:
            request.state.user = user
            return user

    return ANONYMOUS


async def _resolve_token(token: str, settings: Settings) -> User:
    """Verify a JWT off the event loop.

    ``PyJWKClient`` fetches the JWKS over the network with blocking I/O on a
    cache miss; running it inline would stall every other request on the worker.
    """
    return await to_thread.run_sync(_verify_token, token, settings)
