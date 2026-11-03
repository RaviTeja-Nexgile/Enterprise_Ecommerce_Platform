"""Profile and address schemas."""

from __future__ import annotations

from marshmallow import Schema, fields, validate


class ProfileUpdateSchema(Schema):
    first_name = fields.Str(load_default=None, allow_none=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(load_default=None, allow_none=True, validate=validate.Length(min=1, max=100))
    phone = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=40))


class AddressUpdateSchema(Schema):
    type = fields.Str(load_default="shipping", validate=validate.OneOf(["shipping", "billing"]))
    line1 = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    line2 = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=255))
    city = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    state = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=120))
    postal_code = fields.Str(required=True, validate=validate.Length(min=1, max=30))
    country = fields.Str(load_default="United States", validate=validate.Length(min=1, max=80))
    is_default = fields.Bool(load_default=False)


__all__ = ["ProfileUpdateSchema", "AddressUpdateSchema"]
