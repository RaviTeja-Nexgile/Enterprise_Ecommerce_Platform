"""Wishlist request schemas."""

from __future__ import annotations

from marshmallow import Schema, fields


class WishlistItemSchema(Schema):
    product_id = fields.Int(required=True)


__all__ = ["WishlistItemSchema"]
