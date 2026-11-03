"""Registration, sign-in, token rotation, sign-out and password reset."""

from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta
from typing import Any

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token

from ..errors import (
    ApiError,
    AuthenticationError,
    BusinessRuleError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from ..extensions import db
from ..models import PasswordResetToken, RefreshToken, User, utcnow
from ..repositories import user_repo
from ..security import PASSWORD_RULE_MESSAGE, hash_password, is_strong_password, verify_password
from ..utils.mail import send_password_reset_mail
from .serializers import user_dict

EMAIL_TAKEN_MESSAGE = "An account with this email already exists"
INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"
INACTIVE_MESSAGE = "This account is inactive"
RESET_SENT_MESSAGE = "If the email is registered, a reset link has been sent"
INVALID_RESET_MESSAGE = "This reset link is no longer valid"

# Failed logins per email, kept in memory for the 15-minute window.
_FAILED_LOGINS: dict[str, list[float]] = {}
FAILED_LOGIN_LIMIT = 5
FAILED_LOGIN_WINDOW_SECONDS = 15 * 60


def _now_ts() -> float:
    return utcnow().timestamp()


def _record_failure(email: str) -> None:
    window_start = _now_ts() - FAILED_LOGIN_WINDOW_SECONDS
    attempts = [stamp for stamp in _FAILED_LOGINS.get(email, []) if stamp >= window_start]
    attempts.append(_now_ts())
    _FAILED_LOGINS[email] = attempts


def _too_many_failures(email: str) -> bool:
    window_start = _now_ts() - FAILED_LOGIN_WINDOW_SECONDS
    attempts = [stamp for stamp in _FAILED_LOGINS.get(email, []) if stamp >= window_start]
    _FAILED_LOGINS[email] = attempts
    return len(attempts) >= FAILED_LOGIN_LIMIT


def _clear_failures(email: str) -> None:
    _FAILED_LOGINS.pop(email, None)


def _issue_tokens(user: User) -> dict[str, Any]:
    """Create an access token and a stored refresh token for ``user``."""
    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    payload = decode_token(refresh_token)
    expires_at = utcnow() + timedelta(
        seconds=int(current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES").total_seconds())
    )
    user_repo.add_refresh_token(
        RefreshToken(jti=payload["jti"], user_id=user.id, expires_at=expires_at)
    )
    return {"access_token": access_token, "refresh_token": refresh_token}


def register(data: dict[str, Any]) -> dict[str, Any]:
    """Create an active Customer account and sign them in (requirement 1.1)."""
    email = data["email"].strip().lower()
    if user_repo.get_by_email(email) is not None:
        raise ConflictError(EMAIL_TAKEN_MESSAGE, code="email_taken")
    if not is_strong_password(data.get("password")):
        raise ValidationError(
            PASSWORD_RULE_MESSAGE,
            code="weak_password",
            fields={"password": PASSWORD_RULE_MESSAGE},
        )

    role = user_repo.get_role("Customer")
    user = User(
        email=email,
        password_hash=hash_password(data["password"]),
        first_name=data["first_name"].strip(),
        last_name=data["last_name"].strip(),
        phone=(data.get("phone") or None),
        is_active=True,
    )
    if role is not None:
        user.roles = [role]
    user_repo.add(user)
    db.session.flush()

    tokens = _issue_tokens(user)
    db.session.commit()
    return {"user": user_dict(user), **tokens}


def login(data: dict[str, Any]) -> dict[str, Any]:
    """Issue an access and a refresh token (requirement 1.4)."""
    email = data["email"].strip().lower()
    if _too_many_failures(email):
        raise ApiError(
            "Too many sign-in attempts. Please try again later",
            code="rate_limited",
            status_code=429,
        )
    user = user_repo.get_by_email(email)
    if user is None or not verify_password(data["password"], user.password_hash):
        _record_failure(email)
        raise AuthenticationError(INVALID_CREDENTIALS_MESSAGE, code="invalid_credentials")
    if not user.is_active:
        raise ApiError(INACTIVE_MESSAGE, code="inactive", status_code=403)

    _clear_failures(email)
    tokens = _issue_tokens(user)
    db.session.commit()
    return {"user": user_dict(user), **tokens}


def refresh(refresh_token: str | None) -> dict[str, Any]:
    """Rotate the refresh token: revoke the presented one, issue a new pair."""
    if not refresh_token:
        raise AuthenticationError("Your session has expired. Please sign in again", code="session_expired")
    try:
        payload = decode_token(refresh_token)
    except Exception as error:  # noqa: BLE001 - any decode failure is an expired session
        raise AuthenticationError(
            "Your session has expired. Please sign in again", code="session_expired"
        ) from error
    if payload.get("type") != "refresh":
        raise AuthenticationError(
            "Your session has expired. Please sign in again", code="session_expired"
        )

    stored = user_repo.get_refresh_token(payload["jti"])
    if stored is None or stored.revoked_at is not None:
        raise AuthenticationError(
            "Your session has expired. Please sign in again", code="session_expired"
        )
    user = user_repo.get_by_id(stored.user_id)
    if user is None or not user.is_active:
        raise AuthenticationError(
            "Your session has expired. Please sign in again", code="session_expired"
        )

    stored.revoked_at = utcnow()
    tokens = _issue_tokens(user)
    db.session.commit()
    return tokens


def logout(refresh_token: str | None) -> None:
    """Revoke the refresh token (requirement 1.7)."""
    if not refresh_token:
        return
    try:
        payload = decode_token(refresh_token)
    except Exception:  # noqa: BLE001 - an unusable token is already revoked
        return
    stored = user_repo.get_refresh_token(payload.get("jti", ""))
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = utcnow()
        db.session.commit()


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def forgot_password(email: str) -> str:
    """Send a reset link to the local inbox (requirement 1.8)."""
    user = user_repo.get_by_email(email)
    if user is not None and user.is_active:
        token = secrets.token_urlsafe(32)
        user_repo.add_reset_token(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_hash_reset_token(token),
                expires_at=utcnow() + timedelta(hours=1),
            )
        )
        db.session.commit()
        port = current_app.config.get("FRONTEND_PORT", 4200)
        reset_url = f"http://127.0.0.1:{port}/reset-password?token={token}"
        send_password_reset_mail(user.email, reset_url)
    return RESET_SENT_MESSAGE


def reset_password(token: str, password: str) -> None:
    """Set a new password for a valid, unused reset link (requirement 1.9)."""
    stored = user_repo.get_reset_token(_hash_reset_token(token))
    if stored is None or stored.used_at is not None or stored.expires_at <= utcnow():
        raise ValidationError(INVALID_RESET_MESSAGE, code="invalid_token")
    if not is_strong_password(password):
        raise ValidationError(
            PASSWORD_RULE_MESSAGE,
            code="weak_password",
            fields={"password": PASSWORD_RULE_MESSAGE},
        )
    user = user_repo.get_by_id(stored.user_id)
    if user is None:
        raise ValidationError(INVALID_RESET_MESSAGE, code="invalid_token")

    user.password_hash = hash_password(password)
    stored.used_at = utcnow()
    user_repo.revoke_refresh_tokens_for(user.id, utcnow())
    db.session.commit()


def change_password(user: User, current_password: str, new_password: str) -> None:
    """Change the signed-in person's password (requirement 9.3)."""
    if not verify_password(current_password, user.password_hash):
        raise ValidationError("The current password is not correct", code="wrong_password")
    if not is_strong_password(new_password):
        raise ValidationError(
            PASSWORD_RULE_MESSAGE,
            code="weak_password",
            fields={"password": PASSWORD_RULE_MESSAGE},
        )
    user.password_hash = hash_password(new_password)
    db.session.commit()


def get_user_or_404(user_id: int) -> User:
    user = user_repo.get_by_id(user_id)
    if user is None:
        raise NotFoundError()
    return user


__all__ = [
    "register",
    "login",
    "refresh",
    "logout",
    "forgot_password",
    "reset_password",
    "change_password",
    "get_user_or_404",
    "EMAIL_TAKEN_MESSAGE",
    "INVALID_CREDENTIALS_MESSAGE",
    "INACTIVE_MESSAGE",
    "RESET_SENT_MESSAGE",
    "INVALID_RESET_MESSAGE",
    "BusinessRuleError",
]
