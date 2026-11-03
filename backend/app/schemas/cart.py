"""Cart request schemas."""

from __future__ import annotations

from marshmallow import EXCLUDE, Schema, fields, validate


class CartItemSchema(Schema):
    class Meta:
        # A price sent with a cart change is ignored, never rejected.
        unknown = EXCLUDE

    product_id = fields.Int(required=True)
    variant_id = fields.Int(load_default=None, allow_none=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))


class CartItemUpdateSchema(Schema):
    quantity = fields.Int(required=True, validate=validate.Range(min=1))


class MergeCartSchema(Schema):
    guest_token = fields.Str(required=True, validate=validate.Length(min=1, max=64))


class CouponCodeSchema(Schema):
    code = fields.Str(required=True, validate=validate.Length(min=1, max=64))


__all__ = ["CartItemSchema", "CartItemUpdateSchema", "MergeCartSchema", "CouponCodeSchema"]
