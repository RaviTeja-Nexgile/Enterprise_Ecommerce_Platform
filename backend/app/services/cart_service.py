"""Cart items, backend totals, coupon validation and guest-cart merge."""

from __future__ import annotations

from typing import Any

from flask import request

from ..errors import BusinessRuleError, NotFoundError
from ..extensions import db
from ..models import Cart, CartItem, Coupon, CouponRedemption, User, utcnow
from ..repositories import cart_repo, catalog_repo
from ..utils.money import calculate_tax_cents, delivery_fee_cents, line_total_cents
from .serializers import product_summary

COUPON_REFUSED_MESSAGE = "This coupon cannot be used for this order"
INSUFFICIENT_STOCK_MESSAGE = "Only {n} left in stock"


def guest_token_from_request() -> str | None:
    return request.headers.get("X-Guest-Token") or None


def get_cart(user: User | None, guest_token: str | None = None) -> Cart | None:
    if user is not None:
        return cart_repo.active_cart_for_user(user.id)
    if guest_token:
        return cart_repo.active_cart_for_guest(guest_token)
    return None


def get_or_create_cart(user: User | None, guest_token: str | None = None) -> Cart:
    cart = get_cart(user, guest_token)
    if cart is not None:
        return cart
    if user is not None:
        return cart_repo.create_cart(user_id=user.id)
    if not guest_token:
        raise BusinessRuleError("A guest cart needs an X-Guest-Token header", code="guest_token_required")
    return cart_repo.create_cart(guest_token=guest_token)


def _unit_price(product, variant) -> int:
    if variant is not None:
        return variant.price_cents
    return product.effective_price_cents


def _available(product_id: int, variant_id: int | None) -> int:
    return catalog_repo.available_quantity(product_id, variant_id)


def _coupon_discount(coupon: Coupon, subtotal: int, cart: Cart) -> int:
    if coupon.type == "percentage":
        discount = round(subtotal * coupon.value / 100)
        if coupon.max_discount_cents is not None:
            discount = min(discount, coupon.max_discount_cents)
        return discount
    return min(coupon.value, subtotal)


def _coupon_refusal(coupon: Coupon, subtotal: int, user: User | None, cart: Cart) -> str | None:
    now = utcnow()
    if not coupon.is_active:
        return "inactive"
    if coupon.expires_at is not None and coupon.expires_at <= now:
        return "expired"
    if coupon.usage_limit is not None:
        if cart_repo.coupon_redemption_count(coupon.id) >= coupon.usage_limit:
            return "usage_limit"
    if user is not None and coupon.per_customer_limit is not None:
        if cart_repo.coupon_redemptions_for_user(coupon.id, user.id) >= coupon.per_customer_limit:
            return "per_customer_limit"
    if subtotal < coupon.min_order_value_cents:
        return "min_order_value"
    if coupon.category_id is not None:
        product_ids = {item.product_id for item in cart_repo.cart_items(cart.id)}
        matches = any(
            (product := cart_repo.product_by_id(product_id)) is not None
            and product.category_id == coupon.category_id
            for product_id in product_ids
        )
        if not matches:
            return "category"
    return None


def _active_coupon(cart: Cart) -> Coupon | None:
    code = getattr(cart, "_coupon_code", None)
    if not code:
        return None
    return cart_repo.coupon_by_code(code)


def set_coupon_code(cart: Cart, code: str | None) -> None:
    cart._coupon_code = code  # type: ignore[attr-defined]


def cart_payload(cart: Cart | None, user: User | None = None) -> dict[str, Any]:
    """The cart with every total calculated here, never by the client."""
    if cart is None:
        return {
            "items": [],
            "subtotal_cents": 0,
            "discount_cents": 0,
            "tax_cents": 0,
            "shipping_cents": 0,
            "total_cents": 0,
            "item_count": 0,
            "coupon": None,
        }

    items: list[dict[str, Any]] = []
    subtotal = 0
    item_count = 0
    for item in cart_repo.cart_items(cart.id):
        product = cart_repo.product_by_id(item.product_id)
        if product is None:
            continue
        variant = cart_repo.variant_by_id(item.variant_id) if item.variant_id else None
        unit_price = _unit_price(product, variant)
        available = _available(item.product_id, item.variant_id)
        in_stock = available > 0
        line_total = line_total_cents(unit_price, item.quantity)
        if in_stock:
            subtotal += line_total
            item_count += item.quantity
        items.append(
            {
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "unit_price_cents": unit_price,
                "total_cents": line_total,
                "in_stock": in_stock,
                "available_quantity": available,
                "product": product_summary(product, available_quantity=available),
            }
        )

    coupon = _active_coupon(cart)
    discount = 0
    coupon_data = None
    if coupon is not None and _coupon_refusal(coupon, subtotal, user, cart) is None:
        discount = _coupon_discount(coupon, subtotal, cart)
        coupon_data = {"code": coupon.code, "type": coupon.type, "value": coupon.value}

    # An empty cart costs nothing: no shipping fee and no tax.
    shipping = delivery_fee_cents("standard", subtotal - discount) if subtotal else 0
    tax = calculate_tax_cents(subtotal, discount)
    return {
        "items": items,
        "subtotal_cents": subtotal,
        "discount_cents": discount,
        "tax_cents": tax,
        "shipping_cents": shipping,
        "total_cents": subtotal - discount + shipping + tax,
        "item_count": item_count,
        "coupon": coupon_data,
    }


def add_item(user: User | None, guest_token: str | None, data: dict[str, Any]) -> dict[str, Any]:
    """Add a product to the cart, refusing a quantity above the stock (requirement 6.4)."""
    cart = get_or_create_cart(user, guest_token)
    product = cart_repo.product_by_id(data["product_id"])
    if product is None or product.status != "published" or product.deleted_at is not None:
        raise NotFoundError("The requested product was not found")
    variant = None
    if data.get("variant_id"):
        variant = cart_repo.variant_by_id(data["variant_id"])
        if variant is None or variant.product_id != product.id:
            raise NotFoundError("The requested variant was not found")

    available = _available(product.id, variant.id if variant else None)
    existing = cart_repo.find_item(cart.id, product.id, variant.id if variant else None)
    requested = int(data["quantity"]) + (existing.quantity if existing else 0)
    if requested > available:
        raise BusinessRuleError(
            INSUFFICIENT_STOCK_MESSAGE.format(n=available),
            code="insufficient_stock",
            payload={"available_quantity": available},
        )

    unit_price = _unit_price(product, variant)
    if existing is not None:
        existing.quantity = requested
        existing.unit_price_cents = unit_price
    else:
        cart_repo.add_item(
            CartItem(
                cart_id=cart.id,
                product_id=product.id,
                variant_id=variant.id if variant else None,
                quantity=requested,
                unit_price_cents=unit_price,
            )
        )
    db.session.commit()
    return cart_payload(cart, user)


def update_item(user: User | None, guest_token: str | None, item_id: int, quantity: int) -> dict[str, Any]:
    cart = get_cart(user, guest_token)
    if cart is None:
        raise NotFoundError("The requested cart item was not found")
    item = cart_repo.get_item(cart.id, item_id)
    if item is None:
        raise NotFoundError("The requested cart item was not found")
    available = _available(item.product_id, item.variant_id)
    if quantity > available:
        raise BusinessRuleError(
            INSUFFICIENT_STOCK_MESSAGE.format(n=available),
            code="insufficient_stock",
            payload={"available_quantity": available},
        )
    item.quantity = quantity
    product = cart_repo.product_by_id(item.product_id)
    variant = cart_repo.variant_by_id(item.variant_id) if item.variant_id else None
    if product is not None:
        item.unit_price_cents = _unit_price(product, variant)
    db.session.commit()
    return cart_payload(cart, user)


def remove_item(user: User | None, guest_token: str | None, item_id: int) -> dict[str, Any]:
    cart = get_cart(user, guest_token)
    if cart is None:
        raise NotFoundError("The requested cart item was not found")
    item = cart_repo.get_item(cart.id, item_id)
    if item is None:
        raise NotFoundError("The requested cart item was not found")
    cart_repo.delete_item(item)
    db.session.commit()
    return cart_payload(cart, user)


def apply_coupon(user: User | None, guest_token: str | None, code: str) -> dict[str, Any]:
    """Validate a coupon against the cart (requirement 8.4)."""
    cart = get_or_create_cart(user, guest_token)
    coupon = cart_repo.coupon_by_code(code)
    payload = cart_payload(cart, user)
    if coupon is None or _coupon_refusal(coupon, payload["subtotal_cents"], user, cart) is not None:
        raise BusinessRuleError(COUPON_REFUSED_MESSAGE, code="invalid_coupon")
    set_coupon_code(cart, coupon.code)
    return cart_payload(cart, user)


def remove_coupon(user: User | None, guest_token: str | None) -> dict[str, Any]:
    cart = get_cart(user, guest_token)
    if cart is not None:
        set_coupon_code(cart, None)
    return cart_payload(cart, user)


def merge_guest_cart(user: User, guest_token: str) -> dict[str, Any]:
    """Merge a guest cart into the customer's cart (requirement 6.7)."""
    guest_cart = cart_repo.active_cart_for_guest(guest_token)
    if guest_cart is None:
        return cart_payload(get_or_create_cart(user), user)
    target = get_or_create_cart(user)
    for item in cart_repo.cart_items(guest_cart.id):
        available = _available(item.product_id, item.variant_id)
        existing = cart_repo.find_item(target.id, item.product_id, item.variant_id)
        wanted = item.quantity + (existing.quantity if existing else 0)
        quantity = min(wanted, available)
        if quantity <= 0:
            continue
        if existing is not None:
            existing.quantity = quantity
        else:
            cart_repo.add_item(
                CartItem(
                    cart_id=target.id,
                    product_id=item.product_id,
                    variant_id=item.variant_id,
                    quantity=quantity,
                    unit_price_cents=item.unit_price_cents,
                )
            )
    guest_cart.status = "converted"
    db.session.commit()
    return cart_payload(target, user)


def record_redemption(coupon: Coupon, user_id: int, order_id: int) -> None:
    cart_repo.add_redemption(
        CouponRedemption(
            coupon_id=coupon.id,
            user_id=user_id,
            order_id=order_id,
            redeemed_at=utcnow(),
        )
    )


def validate_coupon_for_order(
    code: str | None, subtotal: int, user: User, cart: Cart
) -> tuple[Coupon | None, int]:
    """Return the coupon and its discount, or refuse it (requirement 8.4)."""
    if not code:
        return None, 0
    coupon = cart_repo.coupon_by_code(code)
    if coupon is None or _coupon_refusal(coupon, subtotal, user, cart) is not None:
        raise BusinessRuleError(COUPON_REFUSED_MESSAGE, code="invalid_coupon")
    return coupon, _coupon_discount(coupon, subtotal, cart)


__all__ = [
    "guest_token_from_request",
    "get_cart",
    "get_or_create_cart",
    "cart_payload",
    "add_item",
    "update_item",
    "remove_item",
    "apply_coupon",
    "remove_coupon",
    "merge_guest_cart",
    "record_redemption",
    "validate_coupon_for_order",
    "set_coupon_code",
    "COUPON_REFUSED_MESSAGE",
]
