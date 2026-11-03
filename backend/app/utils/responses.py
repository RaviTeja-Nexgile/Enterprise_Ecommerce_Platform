"""Small helpers that build the JSON bodies the API contract describes."""

from __future__ import annotations

from typing import Any

from flask import jsonify


def ok(data: Any, status: int = 200):
    """Return ``data`` as the JSON body with a status code."""
    return jsonify(data), status


def created(data: Any):
    """Return ``data`` with status 201."""
    return jsonify(data), 201


def no_content():
    """Return an empty 204 answer."""
    return "", 204


def paginated(items: list[Any], meta: dict[str, int]):
    """Return ``{"data": [...], "meta": {...}}`` for a list endpoint."""
    return jsonify({"data": items, "meta": meta}), 200


__all__ = ["ok", "created", "no_content", "paginated"]
