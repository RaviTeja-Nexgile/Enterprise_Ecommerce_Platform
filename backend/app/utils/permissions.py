"""The signed-in user and the permission decorator (design.md RBAC)."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable

from flask import g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..errors import AuthenticationError, PermissionError
from ..extensions import db
from ..models import User


def _load_user(user_id: Any) -> User | None:
    try:
        identifier = int(user_id)
    except (TypeError, ValueError):
        return None
    user = db.session.get(User, identifier)
    if user is None or user.deleted_at is not None:
        return None
    return user


def current_user() -> User | None:
    """Return the user of the current request, or ``None`` when signed out.

    The cache is keyed to the request object, so a user resolved for one
    request is never served to the next one that shares the app context.
    """
    cache = g.get("_current_user_cache")
    if cache is not None and cache[0] is request._get_current_object():
        return cache[1]
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:  # noqa: BLE001 - an invalid token means signed out here
        identity = None
    user = _load_user(identity) if identity is not None else None
    g._current_user_cache = (request._get_current_object(), user)
    return user


def require_user() -> User:
    """Return the signed-in user or answer 401."""
    user = current_user()
    if user is None:
        raise AuthenticationError()
    return user


def require_permission(permission: str) -> Callable:
    """Decorator: the signed-in user must hold ``permission``."""

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args: Any, **kwargs: Any):
            user = require_user()
            if permission not in user.permission_names:
                raise PermissionError()
            return view(*args, **kwargs)

        return wrapper

    return decorator


def require_roles(*roles: str) -> Callable:
    """Decorator: the signed-in user must hold one of ``roles``."""

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args: Any, **kwargs: Any):
            user = require_user()
            if not user.has_role(*roles):
                raise PermissionError()
            return view(*args, **kwargs)

        return wrapper

    return decorator


__all__ = ["current_user", "require_user", "require_permission", "require_roles"]
