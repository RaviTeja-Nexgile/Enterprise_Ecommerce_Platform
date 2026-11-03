"""Admin request schemas."""

from __future__ import annotations

from marshmallow import Schema, fields, validate


class AdminProductSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    sku = fields.Str(required=True, validate=validate.Length(min=1, max=64))
    category_id = fields.Int(required=True)
    brand_id = fields.Int(load_default=None, allow_none=True)
    regular_price_cents = fields.Int(required=True, validate=validate.Range(min=0))
    discounted_price_cents = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=0))
    discount_percentage = fields.Int(load_default=0, validate=validate.Range(min=0, max=100))
    description = fields.Str(load_default=None, allow_none=True)
    short_description = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=500))
    status = fields.Str(load_default="draft", validate=validate.OneOf(["draft", "published", "archived"]))
    is_featured = fields.Bool(load_default=False)
    is_new_arrival = fields.Bool(load_default=False)


class VariantSchema(Schema):
    sku = fields.Str(required=True, validate=validate.Length(min=1, max=64))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    price_cents = fields.Int(required=True, validate=validate.Range(min=0))
    stock = fields.Int(load_default=0, validate=validate.Range(min=0))
    attributes = fields.Dict(load_default=None, allow_none=True)
    status = fields.Str(load_default="published", validate=validate.OneOf(["draft", "published", "archived"]))


class BulkActionSchema(Schema):
    ids = fields.List(fields.Int(), required=True, validate=validate.Length(min=1))
    action = fields.Str(required=True, validate=validate.OneOf(["publish", "unpublish", "archive"]))


class CategorySchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    description = fields.Str(load_default=None, allow_none=True)
    parent_id = fields.Int(load_default=None, allow_none=True)
    status = fields.Str(load_default="active", validate=validate.OneOf(["active", "inactive"]))
    sort_order = fields.Int(load_default=0)
    image_url = fields.Str(load_default=None, allow_none=True)


class BrandSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    description = fields.Str(load_default=None, allow_none=True)
    logo_url = fields.Str(load_default=None, allow_none=True)


class AdminCustomerUpdateSchema(Schema):
    is_active = fields.Bool(required=True)


class AdminOrderStatusSchema(Schema):
    status = fields.Str(
        required=True,
        validate=validate.OneOf(
            ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]
        ),
    )


class AdminInventoryUpdateSchema(Schema):
    quantity = fields.Int(required=True)
    reason = fields.Str(required=True, validate=validate.Length(min=1, max=255))


class AdminCouponSchema(Schema):
    code = fields.Str(required=True, validate=validate.Length(min=1, max=64))
    type = fields.Str(required=True, validate=validate.OneOf(["percentage", "fixed"]))
    value = fields.Int(required=True, validate=validate.Range(min=0))
    min_order_value_cents = fields.Int(load_default=0, validate=validate.Range(min=0))
    max_discount_cents = fields.Int(load_default=None, allow_none=True)
    expires_at = fields.DateTime(load_default=None, allow_none=True)
    usage_limit = fields.Int(load_default=None, allow_none=True)
    per_customer_limit = fields.Int(load_default=None, allow_none=True)
    is_active = fields.Bool(load_default=False)
    category_id = fields.Int(load_default=None, allow_none=True)


class AdminReviewUpdateSchema(Schema):
    status = fields.Str(required=True, validate=validate.OneOf(["approved", "rejected"]))


class AdminUserUpdateSchema(Schema):
    role_id = fields.Int(load_default=None, allow_none=True)
    is_active = fields.Bool(load_default=None, allow_none=True)


__all__ = [
    "AdminProductSchema",
    "VariantSchema",
    "BulkActionSchema",
    "CategorySchema",
    "BrandSchema",
    "AdminCustomerUpdateSchema",
    "AdminOrderStatusSchema",
    "AdminInventoryUpdateSchema",
    "AdminCouponSchema",
    "AdminReviewUpdateSchema",
    "AdminUserUpdateSchema",
]
