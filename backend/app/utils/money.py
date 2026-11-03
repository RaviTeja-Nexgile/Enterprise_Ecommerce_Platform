"""Money rules from design.md "Money, tax, shipping and coupons".

Every amount is an integer number of US cents; no floating point value is
stored or returned.
"""

from __future__ import annotations

TAX_RATE_PERCENT = 8
FREE_STANDARD_SHIPPING_THRESHOLD_CENTS = 10000

DELIVERY_METHODS: dict[str, dict[str, int | str]] = {
    "standard": {"code": "standard", "name": "Standard", "fee_cents": 500},
    "express": {"code": "express", "name": "Express", "fee_cents": 1200},
    "next_day": {"code": "next_day", "name": "Next day", "fee_cents": 2500},
}


def line_total_cents(unit_price_cents: int, quantity: int) -> int:
    """``unit_price_cents * quantity``."""
    return int(unit_price_cents) * int(quantity)


def delivery_fee_cents(delivery_method: str, discounted_subtotal_cents: int) -> int:
    """The shipping fee for a method; Standard is free from 100.00 USD."""
    method = DELIVERY_METHODS.get(delivery_method or "standard", DELIVERY_METHODS["standard"])
    fee = int(method["fee_cents"])
    if method["code"] == "standard" and discounted_subtotal_cents >= FREE_STANDARD_SHIPPING_THRESHOLD_CENTS:
        return 0
    return fee


def calculate_tax_cents(subtotal_cents: int, discount_cents: int) -> int:
    """``round((subtotal - discount) * 8 / 100)``."""
    taxable = max(int(subtotal_cents) - int(discount_cents), 0)
    return round(taxable * TAX_RATE_PERCENT / 100)


def delivery_methods() -> list[dict[str, int | str]]:
    """The delivery methods the checkout offers."""
    return [dict(method) for method in DELIVERY_METHODS.values()]


__all__ = [
    "TAX_RATE_PERCENT",
    "FREE_STANDARD_SHIPPING_THRESHOLD_CENTS",
    "DELIVERY_METHODS",
    "line_total_cents",
    "delivery_fee_cents",
    "calculate_tax_cents",
    "delivery_methods",
]
