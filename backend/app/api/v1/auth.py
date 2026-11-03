"""Auth endpoints: register, login, refresh, logout and password reset."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ...errors import AuthenticationError
from ...middleware.auth import auth_required
from ...middleware.rate_limit import auth_rate_limit
from ...schemas import (
    ChangePasswordSchema,
    ForgotPasswordSchema,
    LoginSchema,
    RefreshSchema,
    RegisterSchema,
    ResetPasswordSchema,
    load_or_raise,
)
from ...services import auth_service
from ...utils.permissions import require_user
from ...utils.responses import created, no_content, ok

bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

REFRESH_COOKIE = "refresh_token"


def _refresh_token_from_request() -> str | None:
    body = request.get_json(silent=True) or {}
    return body.get("refresh_token") or request.cookies.get(REFRESH_COOKIE)


def _set_refresh_cookie(response, token: str):  # noqa: ANN001, ANN202
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        httponly=True,
        samesite="Strict",
        path="/api/v1/auth",
    )
    return response


@bp.post("/register")
@auth_rate_limit
def register():  # noqa: ANN202
    data = load_or_raise(RegisterSchema(), request.get_json(silent=True))
    result = auth_service.register(data)
    response = jsonify(result)
    response.status_code = 201
    return _set_refresh_cookie(response, result["refresh_token"])


@bp.post("/login")
@auth_rate_limit
def login():  # noqa: ANN202
    data = load_or_raise(LoginSchema(), request.get_json(silent=True))
    result = auth_service.login(data)
    response = jsonify(result)
    return _set_refresh_cookie(response, result["refresh_token"])


@bp.post("/refresh")
def refresh():  # noqa: ANN202
    token = _refresh_token_from_request()
    if not token:
        raise AuthenticationError(
            "Your session has expired. Please sign in again", code="session_expired"
        )
    result = auth_service.refresh(token)
    response = jsonify(result)
    return _set_refresh_cookie(response, result["refresh_token"])


@bp.post("/logout")
def logout():  # noqa: ANN202
    auth_service.logout(_refresh_token_from_request())
    response = jsonify({})
    response.status_code = 204
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    return response


@bp.post("/forgot-password")
@auth_rate_limit
def forgot_password():  # noqa: ANN202
    data = load_or_raise(ForgotPasswordSchema(), request.get_json(silent=True))
    message = auth_service.forgot_password(data["email"])
    return ok({"message": message})


@bp.post("/reset-password")
@auth_rate_limit
def reset_password():  # noqa: ANN202
    data = load_or_raise(ResetPasswordSchema(), request.get_json(silent=True))
    auth_service.reset_password(data["token"], data["password"])
    return ok({"message": "Your password has been reset"})


@bp.post("/change-password")
@auth_required
def change_password():  # noqa: ANN202
    data = load_or_raise(ChangePasswordSchema(), request.get_json(silent=True))
    user = require_user()
    auth_service.change_password(user, data["current_password"], data["new_password"])
    return ok({"message": "Password changed"})


__all__ = ["bp", "created", "no_content"]
