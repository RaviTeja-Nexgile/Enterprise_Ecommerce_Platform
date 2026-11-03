"""JWT helpers shared by the blueprints."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable

from flask_jwt_extended import jwt_required

from ..utils.permissions import current_user, require_user


def auth_required(view: Callable) -> Callable:
    """Require a valid access token and a live user row."""

    @jwt_required()
    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any):
        require_user()
        return view(*args, **kwargs)

    return wrapper


def optional_auth(view: Callable) -> Callable:
    """Let the request through with or without a token; ``current_user()`` decides."""

    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any):
        current_user()
        return view(*args, **kwargs)

    return wrapper


__all__ = ["auth_required", "optional_auth"]
