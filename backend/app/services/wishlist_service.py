"""Wishlist items (requirement 7)."""

from __future__ import annotations

from typing import Any

from ..errors import ConflictError, NotFoundError
from ..extensions import db
from ..models import User, WishlistItem, utcnow
from ..repositories import cart_repo, catalog_repo
from .serializers import product_summary


def _wishlist(user: User):
    wishlist = cart_repo.wishlist_for_user(user.id)
    if wishlist is None:
        wishlist = cart_repo.create_wishlist(user.id)
    return wishlist


def list_items(user: User) -> dict[str, Any]:
    wishlist = cart_repo.wishlist_for_user(user.id)
    if wishlist is None:
        return {"items": []}
    items = []
    for item in cart_repo.wishlist_items(wishlist.id):
        product = cart_repo.product_by_id(item.product_id)
        if product is None:
            continue
        available = (
            product.status == "published"
            and product.deleted_at is None
            and catalog_repo.available_quantity(product.id, None) > 0
        )
        items.append(
            {
                "id": item.id,
                "product": product_summary(
                    product, available_quantity=catalog_repo.available_quantity(product.id, None)
                ),
                "available": available,
            }
        )
    return {"items": items}


def add_item(user: User, product_id: int) -> dict[str, Any]:
    """Save a product, keeping one entry (requirement 7.2)."""
    product = cart_repo.product_by_id(product_id)
    if product is None or product.status != "published" or product.deleted_at is not None:
        raise NotFoundError("The requested product was not found")
    wishlist = _wishlist(user)
    if cart_repo.find_wishlist_item(wishlist.id, product_id) is not None:
        raise ConflictError("Already in your wishlist", code="already_saved")
    item = cart_repo.add_wishlist_item(
        WishlistItem(wishlist_id=wishlist.id, product_id=product_id, added_at=utcnow())
    )
    db.session.commit()
    return {"id": item.id, "product_id": product_id}


def remove_item(user: User, item_id: int) -> None:
    wishlist = cart_repo.wishlist_for_user(user.id)
    item = cart_repo.get_wishlist_item(wishlist.id, item_id) if wishlist else None
    if item is None:
        raise NotFoundError("The requested wishlist item was not found")
    cart_repo.delete_wishlist_item(item)
    db.session.commit()


def move_to_cart(user: User, item_id: int) -> dict[str, Any]:
    """Add the product to the cart and remove it from the wishlist (requirement 7.4)."""
    from . import cart_service

    wishlist = cart_repo.wishlist_for_user(user.id)
    item = cart_repo.get_wishlist_item(wishlist.id, item_id) if wishlist else None
    if item is None:
        raise NotFoundError("The requested wishlist item was not found")
    payload = cart_service.add_item(user, None, {"product_id": item.product_id, "quantity": 1})
    cart_repo.delete_wishlist_item(item)
    db.session.commit()
    return payload


__all__ = ["list_items", "add_item", "remove_item", "move_to_cart"]
