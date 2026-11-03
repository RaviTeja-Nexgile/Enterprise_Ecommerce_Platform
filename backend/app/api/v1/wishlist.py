"""Wishlist endpoints."""

from __future__ import annotations

from flask import Blueprint, request

from ...middleware.auth import auth_required
from ...schemas import WishlistItemSchema, load_or_raise
from ...services import wishlist_service
from ...utils.permissions import require_user
from ...utils.responses import created, no_content, ok

bp = Blueprint("wishlist", __name__, url_prefix="/api/v1/wishlist")


@bp.get("")
@auth_required
def list_items():  # noqa: ANN202
    return ok(wishlist_service.list_items(require_user()))


@bp.post("/items")
@auth_required
def add_item():  # noqa: ANN202
    data = load_or_raise(WishlistItemSchema(), request.get_json(silent=True))
    return created(wishlist_service.add_item(require_user(), data["product_id"]))


@bp.delete("/items/<int:item_id>")
@auth_required
def remove_item(item_id: int):  # noqa: ANN202
    wishlist_service.remove_item(require_user(), item_id)
    return no_content()


@bp.post("/items/<int:item_id>/move-to-cart")
@auth_required
def move_to_cart(item_id: int):  # noqa: ANN202
    return ok(wishlist_service.move_to_cart(require_user(), item_id))


__all__ = ["bp"]
