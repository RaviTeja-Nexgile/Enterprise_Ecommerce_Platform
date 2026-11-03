"""Catalog query schemas."""

from __future__ import annotations

from marshmallow import Schema, fields, validate


class ProductQuerySchema(Schema):
    q = fields.Str(load_default=None, allow_none=True)
    category = fields.Str(load_default=None, allow_none=True)
    brand = fields.Str(load_default=None, allow_none=True)
    min_price = fields.Int(load_default=None, allow_none=True)
    max_price = fields.Int(load_default=None, allow_none=True)
    in_stock = fields.Bool(load_default=None, allow_none=True)
    min_rating = fields.Float(load_default=None, allow_none=True)
    sort = fields.Str(
        load_default="newest",
        validate=validate.OneOf(["price_asc", "price_desc", "newest", "popular", "rating"]),
    )
    page = fields.Int(load_default=1)
    per_page = fields.Int(load_default=12)


__all__ = ["ProductQuerySchema"]
