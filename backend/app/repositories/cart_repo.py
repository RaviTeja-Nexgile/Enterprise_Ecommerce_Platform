"""Cart, wishlist and coupon queries."""

from __future__ import annotations

from sqlalchemy import select

from ..extensions import db
from ..models import (
    Cart,
    CartItem,
    Coupon,
    CouponRedemption,
    Product,
    ProductVariant,
    Wishlist,
    WishlistItem,
)


def active_cart_for_user(user_id: int) -> Cart | None:
    return db.session.execute(
        select(Cart).where(Cart.user_id == user_id, Cart.status == "active")
    ).scalars().first()


def active_cart_for_guest(guest_token: str) -> Cart | None:
    return db.session.execute(
        select(Cart).where(Cart.guest_token == guest_token, Cart.status == "active")
    ).scalars().first()


def create_cart(user_id: int | None = None, guest_token: str | None = None) -> Cart:
    cart = Cart(user_id=user_id, guest_token=guest_token, status="active")
    db.session.add(cart)
    db.session.flush()
    return cart


def cart_items(cart_id: int) -> list[CartItem]:
    return list(
        db.session.execute(
            select(CartItem).where(CartItem.cart_id == cart_id).order_by(CartItem.id)
        ).scalars().all()
    )


def get_item(cart_id: int, item_id: int) -> CartItem | None:
    return db.session.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart_id)
    ).scalar_one_or_none()


def find_item(cart_id: int, product_id: int, variant_id: int | None) -> CartItem | None:
    return db.session.execute(
        select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id,
        )
    ).scalar_one_or_none()


def add_item(item: CartItem) -> CartItem:
    db.session.add(item)
    return item


def delete_item(item: CartItem) -> None:
    db.session.delete(item)


def product_by_id(product_id: int) -> Product | None:
    return db.session.get(Product, product_id)


def variant_by_id(variant_id: int) -> ProductVariant | None:
    return db.session.get(ProductVariant, variant_id)


def coupon_by_code(code: str) -> Coupon | None:
    return db.session.execute(
        select(Coupon).where(Coupon.code == code.strip().upper())
    ).scalar_one_or_none()


def coupon_redemption_count(coupon_id: int) -> int:
    return len(
        db.session.execute(
            select(CouponRedemption.id).where(CouponRedemption.coupon_id == coupon_id)
        ).scalars().all()
    )


def coupon_redemptions_for_user(coupon_id: int, user_id: int) -> int:
    return len(
        db.session.execute(
            select(CouponRedemption.id).where(
                CouponRedemption.coupon_id == coupon_id,
                CouponRedemption.user_id == user_id,
            )
        ).scalars().all()
    )


def add_redemption(redemption: CouponRedemption) -> CouponRedemption:
    db.session.add(redemption)
    return redemption


def wishlist_for_user(user_id: int) -> Wishlist | None:
    return db.session.execute(
        select(Wishlist).where(Wishlist.user_id == user_id)
    ).scalar_one_or_none()


def create_wishlist(user_id: int) -> Wishlist:
    wishlist = Wishlist(user_id=user_id)
    db.session.add(wishlist)
    db.session.flush()
    return wishlist


def wishlist_items(wishlist_id: int) -> list[WishlistItem]:
    return list(
        db.session.execute(
            select(WishlistItem)
            .where(WishlistItem.wishlist_id == wishlist_id)
            .order_by(WishlistItem.added_at.desc())
        ).scalars().all()
    )


def find_wishlist_item(wishlist_id: int, product_id: int) -> WishlistItem | None:
    return db.session.execute(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wishlist_id,
            WishlistItem.product_id == product_id,
        )
    ).scalar_one_or_none()


def get_wishlist_item(wishlist_id: int, item_id: int) -> WishlistItem | None:
    return db.session.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist_id
        )
    ).scalar_one_or_none()


def add_wishlist_item(item: WishlistItem) -> WishlistItem:
    db.session.add(item)
    return item


def delete_wishlist_item(item: WishlistItem) -> None:
    db.session.delete(item)


__all__ = [
    "active_cart_for_user",
    "active_cart_for_guest",
    "create_cart",
    "cart_items",
    "get_item",
    "find_item",
    "add_item",
    "delete_item",
    "product_by_id",
    "variant_by_id",
    "coupon_by_code",
    "coupon_redemption_count",
    "coupon_redemptions_for_user",
    "add_redemption",
    "wishlist_for_user",
    "create_wishlist",
    "wishlist_items",
    "find_wishlist_item",
    "get_wishlist_item",
    "add_wishlist_item",
    "delete_wishlist_item",
]
