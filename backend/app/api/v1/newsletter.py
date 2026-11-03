"""Newsletter subscription."""

from __future__ import annotations

from flask import Blueprint, request
from marshmallow import Schema, ValidationError as MarshmallowValidationError, fields

from ...errors import ValidationError
from ...services import catalog_service
from ...utils.responses import created

bp = Blueprint("newsletter", __name__, url_prefix="/api/v1")


class NewsletterSchema(Schema):
    email = fields.Email(required=True)


@bp.post("/newsletter")
def subscribe():  # noqa: ANN202
    payload = request.get_json(silent=True) or {}
    try:
        data = NewsletterSchema().load(payload)
    except MarshmallowValidationError:
        raise ValidationError(
            "Enter a valid email address", fields={"email": "Enter a valid email address"}
        )
    catalog_service.subscribe_newsletter(data["email"])
    return created({"message": "Thanks for subscribing"})


__all__ = ["bp"]
