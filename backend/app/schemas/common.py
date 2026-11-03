"""Schema helpers: validation that answers the API error envelope."""

from __future__ import annotations

from typing import Any

from marshmallow import Schema, ValidationError as MarshmallowValidationError

from ..errors import ValidationError


def load_or_raise(schema: Schema, payload: Any) -> dict[str, Any]:
    """Validate ``payload`` with ``schema`` or raise the API ``ValidationError``."""
    try:
        return schema.load(payload or {})
    except MarshmallowValidationError as error:
        fields = {
            field: (messages[0] if isinstance(messages, list) and messages else str(messages))
            for field, messages in error.messages.items()
        }
        raise ValidationError(
            "The request is not valid", fields=fields
        ) from error


__all__ = ["load_or_raise"]
