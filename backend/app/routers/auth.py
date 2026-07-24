"""Login, logout, and signup routes (Supabase Auth + profiles)."""

import re
from typing import Annotated, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from supabase_auth.errors import (
    AuthApiError,
    AuthInvalidCredentialsError,
    AuthRetryableError,
)

from app.supabase_client import create_auth_client, get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS_DETAIL = "Invalid email, phone, or password"
AUTH_UNAVAILABLE_DETAIL = "Authentication service unavailable"
SIGNUP_UNAVAILABLE_DETAIL = "Unable to create account"
EMAIL_TAKEN_DETAIL = "An account with this email already exists"
PHONE_TAKEN_DETAIL = "An account with this phone number already exists"

# Loose email shape check (not full RFC). Password hashing stays on Supabase.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# E.164-ish: + then country code (non-zero) and up to 15 digits total.
_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")


class LoginRequest(BaseModel):
    email: str
    phone: str
    password: str


class SignupRequest(BaseModel):
    email: str
    phone: str
    password: str = Field(min_length=8)
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_shape(cls, value: str) -> str:
        email = value.strip()
        if not email or not _EMAIL_RE.fullmatch(email):
            raise ValueError("Invalid email address")
        return email

    @field_validator("phone")
    @classmethod
    def validate_phone_e164(cls, value: str) -> str:
        phone = _normalize_phone(value)
        if not _E164_RE.fullmatch(phone):
            raise ValueError("Phone must be in E.164 format (e.g. +353871234567)")
        return phone


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


def _signup_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=SIGNUP_UNAVAILABLE_DETAIL,
    )


def _invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=INVALID_CREDENTIALS_DETAIL,
    )


def _email_taken() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=EMAIL_TAKEN_DETAIL,
    )


def _phone_taken() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=PHONE_TAKEN_DETAIL,
    )


def _profile_phone_exists(supabase, phone: str) -> bool:
    """True if profiles already has this phone (UNIQUE)."""
    result = (
        supabase.table("profiles")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .execute()
    )
    return bool(result.data)


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    supabase = get_supabase()

    # 1. Password grant (email + password only — phone checked against profiles next).
    # Use a throwaway client so the shared service-role client never stores a user JWT.
    try:
        auth_response = create_auth_client().auth.sign_in_with_password(
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


@router.post("/signup", response_model=LoginResponse)
def signup(body: SignupRequest) -> LoginResponse:
    """Create Auth user + profile, then return the same token shape as login."""
    supabase = get_supabase()
    # Phone already normalized by SignupRequest validator.
    phone = body.phone
    created_user_id: Optional[str] = None

    # 1. Phone duplicate check BEFORE create_user — specific 409 (unlike login's opaque 401).
    # Email uniqueness is left to admin.create_user's native duplicate error below.
    try:
        if _profile_phone_exists(supabase, phone):
            raise _phone_taken()
    except HTTPException:
        raise
    except AuthRetryableError as exc:
        raise _signup_unavailable() from exc
    except Exception as exc:
        raise _signup_unavailable() from exc

    # 2. Create Auth user.
    # TODO(launch): Re-enable "Confirm email" in Supabase Auth before public launch.
    # email_confirm=True auto-confirms for local/dev speed (same reason Confirm email
    # is currently OFF in the dashboard) — do not ship this to production as-is.
    try:
        create_response = supabase.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
            }
        )
    except AuthApiError as exc:
        # Duplicate email (or race) → specific 409 from create_user's own error.
        message = str(getattr(exc, "message", "") or exc).lower()
        if "already" in message or "registered" in message or "exists" in message:
            raise _email_taken() from exc
        raise _signup_unavailable() from exc
    except AuthRetryableError as exc:
        raise _signup_unavailable() from exc
    except Exception as exc:
        raise _signup_unavailable() from exc

    if create_response.user is None or not create_response.user.id:
        raise _signup_unavailable()

    created_user_id = str(create_response.user.id)
    email = create_response.user.email or body.email

    # 3. Insert matching profiles row. On failure, delete the Auth user so we
    # never leave an orphaned auth.users row without a profile (hit that bug by hand).
    profile_payload = {
        "id": created_user_id,
        "phone": phone,
        "full_name": body.full_name,
    }
    try:
        supabase.table("profiles").insert(profile_payload).execute()
    except Exception as exc:
        try:
            supabase.auth.admin.delete_user(created_user_id)
        except Exception:
            # Best-effort compensation; still fail closed below.
            pass
        # Phone UNIQUE race between check and insert → specific 409 after cleanup.
        message = str(exc).lower()
        if "duplicate" in message or "unique" in message:
            raise _phone_taken() from exc
        raise _signup_unavailable() from exc

    # 4. Auto-login: same credential grant + response shape as /auth/login.
    # Throwaway client — must not pollute the shared admin client (see create_auth_client).
    try:
        auth_response = create_auth_client().auth.sign_in_with_password(
            {
                "email": body.email,
                "password": body.password,
            }
        )
    except (AuthApiError, AuthInvalidCredentialsError, AuthRetryableError) as exc:
        raise _signup_unavailable() from exc
    except Exception as exc:
        raise _signup_unavailable() from exc

    session = auth_response.session
    if session is None or auth_response.user is None:
        raise _signup_unavailable()

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=int(session.expires_in),
        user=LoginUser(
            id=created_user_id,
            email=email,
            phone=phone,
            full_name=body.full_name,
        ),
    )


@router.get("/me", response_model=LoginUser)
def me(
    authorization: Annotated[Optional[str], Header()] = None,
) -> LoginUser:
    """Return the current user's profile for the supplied access token.

    A missing/invalid/expired token returns 401 so the client clears its
    local session and routes back to login; Supabase outages return 500.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    access_token = authorization.split(" ", 1)[1].strip()
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token",
        )

    # Validate the token with Supabase. Throwaway client so the shared admin
    # client never stores a user session (see create_auth_client docstring).
    try:
        user_response = create_auth_client().auth.get_user(access_token)
    except (AuthApiError, AuthInvalidCredentialsError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        ) from exc
    except AuthRetryableError as exc:
        raise _auth_unavailable() from exc
    except Exception as exc:
        raise _auth_unavailable() from exc

    user = getattr(user_response, "user", None)
    if user is None or not user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        )
    user_id = str(user.id)

    # Load stored phone + name from profiles (service-role read).
    try:
        profile_result = (
            get_supabase()
            .table("profiles")
            .select("phone, full_name")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
    except AuthRetryableError as exc:
        raise _auth_unavailable() from exc
    except Exception as exc:
        raise _auth_unavailable() from exc

    profile = profile_result.data if profile_result else None
    return LoginUser(
        id=user_id,
        email=user.email or "",
        phone=str(profile["phone"]) if profile and profile.get("phone") else "",
        full_name=profile.get("full_name") if profile else None,
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
