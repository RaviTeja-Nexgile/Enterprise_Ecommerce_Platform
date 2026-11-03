"""Cart endpoints: items, coupon and guest-cart merge."""

from __future__ import annotations

from flask import Blueprint, request

from ...middleware.auth import auth_required, optional_auth
from ...schemas import (
    CartItemSchema,
    CartItemUpdateSchema,
    CouponCodeSchema,
    MergeCartSchema,
    load_or_raise,
)
from ...services import cart_service
from ...utils.permissions import current_user, require_user
from ...utils.responses import created, ok

bp = Blueprint("cart", __name__, url_prefix="/api/v1/cart")


def _guest_token() -> str | None:
    return cart_service.guest_token_from_request()


@bp.get("")
@optional_auth
def get_cart():  # noqa: ANN202
    user = current_user()
    cart = cart_service.get_cart(user, _guest_token())
    return ok(cart_service.cart_payload(cart, user))


@bp.post("/items")
@optional_auth
def add_item():  # noqa: ANN202
    data = load_or_raise(CartItemSchema(), request.get_json(silent=True))
    payload = cart_service.add_item(current_user(), _guest_token(), data)
    return created(payload)


@bp.put("/items/<int:item_id>")
@optional_auth
def update_item(item_id: int):  # noqa: ANN202
    data = load_or_raise(CartItemUpdateSchema(), request.get_json(silent=True))
    return ok(cart_service.update_item(current_user(), _guest_token(), item_id, data["quantity"]))


@bp.delete("/items/<int:item_id>")
@optional_auth
def remove_item(item_id: int):  # noqa: ANN202
    return ok(cart_service.remove_item(current_user(), _guest_token(), item_id))


@bp.post("/merge")
@auth_required
def merge():  # noqa: ANN202
    data = load_or_raise(MergeCartSchema(), request.get_json(silent=True))
    return ok(cart_service.merge_guest_cart(require_user(), data["guest_token"]))


@bp.post("/coupon")
@optional_auth
def apply_coupon():  # noqa: ANN202
    data = load_or_raise(CouponCodeSchema(), request.get_json(silent=True))
    return ok(cart_service.apply_coupon(current_user(), _guest_token(), data["code"]))


@bp.delete("/coupon")
@optional_auth
def remove_coupon():  # noqa: ANN202
    return ok(cart_service.remove_coupon(current_user(), _guest_token()))


__all__ = ["bp"]
