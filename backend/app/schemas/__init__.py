"""Marshmallow schemas that validate every request body."""

from .admin import (
    AdminCouponSchema,
    AdminCustomerUpdateSchema,
    AdminInventoryUpdateSchema,
    AdminOrderStatusSchema,
    AdminProductSchema,
    AdminReviewUpdateSchema,
    AdminUserUpdateSchema,
    BulkActionSchema,
    CategorySchema,
    BrandSchema,
    VariantSchema,
)
from .auth import (
    ChangePasswordSchema,
    ForgotPasswordSchema,
    LoginSchema,
    RefreshSchema,
    RegisterSchema,
    ResetPasswordSchema,
)
from .cart import CartItemSchema, CartItemUpdateSchema, CouponCodeSchema, MergeCartSchema
from .catalog import ProductQuerySchema
from .checkout import AddressSchema, PlaceOrderSchema
from .common import load_or_raise
from .review import ReviewSchema
from .user import AddressUpdateSchema, ProfileUpdateSchema
from .wishlist import WishlistItemSchema

__all__ = [
    "AdminCouponSchema",
    "AdminCustomerUpdateSchema",
    "AdminInventoryUpdateSchema",
    "AdminOrderStatusSchema",
    "AdminProductSchema",
    "AdminReviewUpdateSchema",
    "AdminUserUpdateSchema",
    "BulkActionSchema",
    "CategorySchema",
    "BrandSchema",
    "VariantSchema",
    "ChangePasswordSchema",
    "ForgotPasswordSchema",
    "LoginSchema",
    "RefreshSchema",
    "RegisterSchema",
    "ResetPasswordSchema",
    "CartItemSchema",
    "CartItemUpdateSchema",
    "CouponCodeSchema",
    "MergeCartSchema",
    "ProductQuerySchema",
    "AddressSchema",
    "PlaceOrderSchema",
    "load_or_raise",
    "ReviewSchema",
    "AddressUpdateSchema",
    "ProfileUpdateSchema",
    "WishlistItemSchema",
]
