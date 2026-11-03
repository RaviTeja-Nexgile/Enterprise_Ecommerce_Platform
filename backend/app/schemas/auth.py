"""Auth request schemas (design.md "Auth")."""

from __future__ import annotations

from marshmallow import Schema, fields, validate


class RegisterSchema(Schema):
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    password = fields.Str(required=True)
    phone = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=40))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class RefreshSchema(Schema):
    refresh_token = fields.Str(load_default=None, allow_none=True)


class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    token = fields.Str(required=True)
    password = fields.Str(required=True)


class ChangePasswordSchema(Schema):
    current_password = fields.Str(required=True)
    new_password = fields.Str(required=True)


__all__ = [
    "RegisterSchema",
    "LoginSchema",
    "RefreshSchema",
    "ForgotPasswordSchema",
    "ResetPasswordSchema",
    "ChangePasswordSchema",
]
