"""Checkout summary and order placement with transactional stock reservation."""

from __future__ import annotations

from typing import Any

from ..errors import BusinessRuleError, NotFoundError, ValidationError
from ..extensions import db
from ..models import (
    Address,
    Cart,
    Order,
    OrderItem,
    OrderStatusHistory,
    User,
    utcnow,
)
from ..repositories import cart_repo, catalog_repo, order_repo, user_repo
from ..utils.money import calculate_tax_cents, delivery_fee_cents, delivery_methods, line_total_cents
from . import cart_service, payment_service
from .serializers import order_dict

OUT_OF_STOCK_MESSAGE = "Some items are no longer available"
PAYMENT_FAILED_MESSAGE = "Payment was not completed"


def _cart_lines(cart: Cart | None, *, include_unavailable: bool = False) -> list[dict[str, Any]]:
    """The cart lines with their stored prices.

    ``include_unavailable`` keeps lines whose stock ran out, so placing the
    order can name them in the "Some items are no longer available" answer.
    """
    if cart is None:
        return []
    lines: list[dict[str, Any]] = []
    for item in cart_repo.cart_items(cart.id):
        product = cart_repo.product_by_id(item.product_id)
        if product is None:
            continue
        variant = cart_repo.variant_by_id(item.variant_id) if item.variant_id else None
        available = catalog_repo.available_quantity(item.product_id, item.variant_id)
        if available <= 0 and not include_unavailable:
            continue
        unit_price = variant.price_cents if variant else product.effective_price_cents
        lines.append(
            {
                "product": product,
                "variant": variant,
                "quantity": item.quantity,
                "unit_price_cents": unit_price,
                "total_cents": line_total_cents(unit_price, item.quantity),
                "available": available,
            }
        )
    return lines


def summary(user: User, coupon_code: str | None = None, delivery_method: str = "standard") -> dict[str, Any]:
    """Items, subtotal, discount, shipping, tax and total (requirement 8.5)."""
    cart = cart_service.get_cart(user)
    lines = _cart_lines(cart)
    subtotal = sum(line["total_cents"] for line in lines)
    discount = 0
    if coupon_code and cart is not None:
        _, discount = cart_service.validate_coupon_for_order(coupon_code, subtotal, user, cart)
    shipping = delivery_fee_cents(delivery_method, subtotal - discount)
    tax = calculate_tax_cents(subtotal, discount)
    return {
        "items": [
            {
                "product_id": line["product"].id,
                "variant_id": line["variant"].id if line["variant"] else None,
                "name": line["product"].name,
                "sku": line["variant"].sku if line["variant"] else line["product"].sku,
                "quantity": line["quantity"],
                "unit_price_cents": line["unit_price_cents"],
                "total_cents": line["total_cents"],
            }
            for line in lines
        ],
        "subtotal_cents": subtotal,
        "discount_cents": discount,
        "shipping_cents": shipping,
        "tax_cents": tax,
        "total_cents": subtotal - discount + shipping + tax,
        "delivery_methods": delivery_methods(),
    }


def _resolve_address(
    user: User, address_id: int | None, address_data: dict[str, Any] | None, address_type: str
) -> Address:
    if address_id:
        address = user_repo.get_address(user.id, address_id)
        if address is None:
            raise NotFoundError("The requested address was not found")
        return address
    if not address_data:
        raise ValidationError(
            f"A {address_type} address is required",
            fields={f"{address_type}_address": "A shipping address is required"},
        )
    payload = dict(address_data)
    payload["type"] = address_type
    address = Address(user_id=user.id, **payload)
    db.session.add(address)
    db.session.flush()
    return address


def place_order(user: User, data: dict[str, Any]) -> dict[str, Any]:
    """Reserve stock, create the order and take the mock payment (requirement 8)."""
    cart = cart_service.get_cart(user)
    lines = _cart_lines(cart, include_unavailable=True)
    if not lines:
        raise BusinessRuleError(OUT_OF_STOCK_MESSAGE, code="out_of_stock", payload={"items": []})

    # Refuse before touching anything when a line exceeds the stock.
    unavailable = [
        {
            "product_id": line["product"].id,
            "variant_id": line["variant"].id if line["variant"] else None,
            "name": line["product"].name,
            "requested": line["quantity"],
            "available": line["available"],
        }
        for line in lines
        if line["quantity"] > line["available"]
    ]
    if unavailable:
        raise BusinessRuleError(
            OUT_OF_STOCK_MESSAGE, code="out_of_stock", payload={"items": unavailable}
        )

    shipping_address = _resolve_address(
        user, data.get("shipping_address_id"), data.get("shipping_address"), "shipping"
    )
    billing_address = _resolve_address(
        user,
        data.get("billing_address_id"),
        data.get("billing_address") or data.get("shipping_address"),
        "billing",
    )

    subtotal = sum(line["total_cents"] for line in lines)
    coupon, discount = cart_service.validate_coupon_for_order(
        data.get("coupon_code"), subtotal, user, cart
    )
    delivery_method = data.get("delivery_method") or "standard"
    shipping = delivery_fee_cents(delivery_method, subtotal - discount)
    tax = calculate_tax_cents(subtotal, discount)
    total = subtotal - discount + shipping + tax

    order = Order(
        order_number=order_repo.next_order_number(utcnow().year),
        user_id=user.id,
        status="pending",
        payment_status="pending",
        subtotal_cents=subtotal,
        discount_cents=discount,
        shipping_cents=shipping,
        tax_cents=tax,
        total_cents=total,
        coupon_id=coupon.id if coupon else None,
        shipping_address_id=shipping_address.id,
        billing_address_id=billing_address.id,
        delivery_method=delivery_method,
        placed_at=utcnow(),
    )
    order_repo.add_order(order)
    db.session.flush()

    # Reserve the stock in this transaction; a second order for the last unit
    # sees the reservation and is refused (requirement 16.6).
    for line in lines:
        inventory = catalog_repo.inventory_for_update(
            line["product"].id, line["variant"].id if line["variant"] else None
        )
        if inventory is None or inventory.available_quantity < line["quantity"]:
            db.session.rollback()
            raise BusinessRuleError(
                OUT_OF_STOCK_MESSAGE,
                code="out_of_stock",
                payload={
                    "items": [
                        {
                            "product_id": line["product"].id,
                            "name": line["product"].name,
                            "requested": line["quantity"],
                            "available": inventory.available_quantity if inventory else 0,
                        }
                    ]
                },
            )
        inventory.reserved_quantity += line["quantity"]
        catalog_repo.add_movement(
            inventory, -line["quantity"], f"Reserved for order {order.order_number}", user.id
        )
        order_repo.add_order_item(
            OrderItem(
                order_id=order.id,
                product_id=line["product"].id,
                variant_id=line["variant"].id if line["variant"] else None,
                product_name=line["product"].name,
                sku=line["variant"].sku if line["variant"] else line["product"].sku,
                quantity=line["quantity"],
                unit_price_cents=line["unit_price_cents"],
                total_cents=line["total_cents"],
            )
        )

    order_repo.add_status_history(
        OrderStatusHistory(
            order_id=order.id,
            status="pending",
            changed_by=user.id,
            changed_at=utcnow(),
            note="Order placed",
        )
    )
    db.session.flush()

    payment = data["payment"]
    try:
        result = payment_service.charge(
            payment["card_number"], payment["expiry"], payment["cvc"]
        )
    except BusinessRuleError as error:
        # Release the reservation and keep the order pending (requirement 8.10).
        for line in lines:
            inventory = catalog_repo.inventory_for(
                line["product"].id, line["variant"].id if line["variant"] else None
            )
            if inventory is not None:
                inventory.reserved_quantity = max(
                    inventory.reserved_quantity - line["quantity"], 0
                )
                catalog_repo.add_movement(
                    inventory, line["quantity"], f"Released after failed payment for {order.order_number}", user.id
                )
        status = "cancelled" if error.code == "payment_cancelled" else "failed"
        order.payment_status = status
        payment_service.record_payment(order, total, status)
        db.session.commit()
        raise BusinessRuleError(
            PAYMENT_FAILED_MESSAGE, code="payment_failed", status_code=402
        ) from error

    order.status = "confirmed"
    order.payment_status = "success"
    payment_service.record_payment(order, total, "success", result["transaction_id"])
    order_repo.add_status_history(
        OrderStatusHistory(
            order_id=order.id,
            status="confirmed",
            changed_by=user.id,
            changed_at=utcnow(),
            note="Payment received",
        )
    )
    if coupon is not None:
        cart_service.record_redemption(coupon, user.id, order.id)
    if cart is not None:
        cart.status = "converted"
    db.session.commit()

    return order_dict(order, payment=order_repo.latest_payment(order.id), history=[])


__all__ = ["summary", "place_order", "OUT_OF_STOCK_MESSAGE", "PAYMENT_FAILED_MESSAGE"]
