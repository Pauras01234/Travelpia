"""Login and logout routes (Supabase Auth + profiles phone check)."""

from typing import Annotated, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from supabase_auth.errors import (
    AuthApiError,
    AuthInvalidCredentialsError,
    AuthRetryableError,
)

from app.supabase_client import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS_DETAIL = "Invalid email, phone, or password"
AUTH_UNAVAILABLE_DETAIL = "Authentication service unavailable"


class LoginRequest(BaseModel):
    email: str
    phone: str
    password: str


class LoginUser(BaseModel):
    id: str
    email: str
    phone: str
    full_name: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: LoginUser


class LogoutRequest(BaseModel):
    refresh_token: str


class LogoutResponse(BaseModel):
    success: bool


def _normalize_phone(phone: str) -> str:
    """Strip all whitespace so stored and submitted phones compare reliably."""
    return "".join(phone.split())


def _auth_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=AUTH_UNAVAILABLE_DETAIL,
    )


def _invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=INVALID_CREDENTIALS_DETAIL,
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    supabase = get_supabase()

    # 1. Password grant (email + password only — phone checked against profiles next).
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": body.email,
                "password": body.password,
            }
        )
    except (AuthApiError, AuthInvalidCredentialsError) as exc:
        # Credential-style Auth failures → same opaque 401. Outages → 500.
        status_code = getattr(exc, "status", 400)
        if status_code in (400, 401, 403, 422):
            raise _invalid_credentials() from exc
        raise _auth_unavailable() from exc
    except AuthRetryableError as exc:
        raise _auth_unavailable() from exc
    except Exception as exc:
        # Network/timeouts and other unexpected Supabase failures — not a 401.
        raise _auth_unavailable() from exc

    # 2. Failed grant (no session) → opaque 401.
    session = auth_response.session
    if session is None or auth_response.user is None:
        raise _invalid_credentials()

    user_id = str(auth_response.user.id)
    email = auth_response.user.email or body.email

    # 3. Look up stored phone for this user.
    try:
        profile_result = (
            supabase.table("profiles")
            .select("phone, full_name")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
    except AuthRetryableError as exc:
        raise _auth_unavailable() from exc
    except Exception as exc:
        raise _auth_unavailable() from exc

    # maybe_single() returns None when no row exists — treat as opaque 401.
    if profile_result is None or not profile_result.data:
        raise _invalid_credentials()

    profile = profile_result.data
    if not profile.get("phone"):
        raise _invalid_credentials()

    # 4–5. Normalize and compare phones; mismatch uses the same 401 as bad password.
    stored_phone = _normalize_phone(str(profile["phone"]))
    submitted_phone = _normalize_phone(body.phone)
    if not stored_phone or stored_phone != submitted_phone:
        raise _invalid_credentials()

    # 6. Success.
    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=int(session.expires_in),
        user=LoginUser(
            id=user_id,
            email=email,
            phone=str(profile["phone"]),
            full_name=profile.get("full_name"),
        ),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    body: LogoutRequest,
    authorization: Annotated[Optional[str], Header()] = None,
) -> LogoutResponse:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    access_token = authorization.split(" ", 1)[1].strip()
    if not access_token or not body.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    supabase = get_supabase()

    # Revoke the caller's session via the Admin Auth API.
    # set_session()+auth.sign_out() on the shared service-role client does not
    # reliably bind/revoke the user session (AuthApiError was also swallowed).
    # supabase-py 2.31.0 exposes auth.admin.sign_out(jwt, scope) which POSTs
    # /logout with the user's access token — that actually revokes refresh tokens.
    try:
        supabase.auth.admin.sign_out(access_token, "local")
    except AuthRetryableError as exc:
        raise _auth_unavailable() from exc
    except AuthApiError:
        # Token already invalid/expired — still treat logout as successful.
        pass
    except Exception as exc:
        raise _auth_unavailable() from exc

    return LogoutResponse(success=True)
