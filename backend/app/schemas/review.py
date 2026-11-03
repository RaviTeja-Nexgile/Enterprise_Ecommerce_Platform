"""Review request schema."""

from __future__ import annotations

from marshmallow import Schema, fields


class ReviewSchema(Schema):
    # The rating and comment rules live in the review service so the refusal
    # carries the exact message of requirement 10.3.
    rating = fields.Int(required=True)
    comment = fields.Str(required=True)


__all__ = ["ReviewSchema"]
