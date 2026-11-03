"""Checkout request schemas."""

from __future__ import annotations

from marshmallow import Schema, fields, validate


class AddressSchema(Schema):
    type = fields.Str(load_default="shipping", validate=validate.OneOf(["shipping", "billing"]))
    line1 = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    line2 = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=255))
    city = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    state = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=120))
    postal_code = fields.Str(required=True, validate=validate.Length(min=1, max=30))
    country = fields.Str(load_default="United States", validate=validate.Length(min=1, max=80))
    is_default = fields.Bool(load_default=False)


class PaymentSchema(Schema):
    card_number = fields.Str(required=True)
    expiry = fields.Str(required=True)
    cvc = fields.Str(required=True)


class PlaceOrderSchema(Schema):
    shipping_address_id = fields.Int(load_default=None, allow_none=True)
    shipping_address = fields.Nested(AddressSchema, load_default=None, allow_none=True)
    billing_address_id = fields.Int(load_default=None, allow_none=True)
    billing_address = fields.Nested(AddressSchema, load_default=None, allow_none=True)
    delivery_method = fields.Str(
        load_default="standard", validate=validate.OneOf(["standard", "express", "next_day"])
    )
    coupon_code = fields.Str(load_default=None, allow_none=True)
    payment = fields.Nested(PaymentSchema, required=True)


__all__ = ["AddressSchema", "PaymentSchema", "PlaceOrderSchema"]
