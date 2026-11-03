"""The mock payment gateway and refunds.

The gateway accepts a 16-digit card number with a future expiry and any
3-digit security code. A card ending ``0000`` fails and one ending ``9999`` is
cancelled. No card data is stored anywhere.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from ..errors import BusinessRuleError
from ..extensions import db
from ..models import Order, Payment, utcnow

PAYMENT_FAILED_MESSAGE = "Payment was not completed"


def _digits(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def _expiry_is_future(expiry: str) -> bool:
    match = re.fullmatch(r"\s*(\d{1,2})\s*/\s*(\d{2,4})\s*", expiry or "")
    if not match:
        return False
    month = int(match.group(1))
    year = int(match.group(2))
    if year < 100:
        year += 2000
    if not 1 <= month <= 12:
        return False
    today = utcnow().date()
    return (year, month) >= (today.year, today.month)


def charge(card_number: str, expiry: str, cvc: str) -> dict[str, Any]:
    """Run the mock gateway and return ``{status, transaction_id}``."""
    number = _digits(card_number)
    if len(number) != 16 or not _expiry_is_future(expiry) or len(_digits(cvc)) != 3:
        raise BusinessRuleError(PAYMENT_FAILED_MESSAGE, code="payment_failed", status_code=402)
    if number.endswith("0000"):
        raise BusinessRuleError(PAYMENT_FAILED_MESSAGE, code="payment_failed", status_code=402)
    if number.endswith("9999"):
        raise BusinessRuleError(PAYMENT_FAILED_MESSAGE, code="payment_cancelled", status_code=402)
    return {"status": "success", "transaction_id": f"mock-{utcnow().strftime('%Y%m%d%H%M%S%f')}"}


def record_payment(
    order: Order, amount_cents: int, status: str, transaction_id: str | None = None
) -> Payment:
    payment = Payment(
        order_id=order.id,
        amount_cents=amount_cents,
        status=status,
        method="card",
        transaction_id=transaction_id,
    )
    db.session.add(payment)
    return payment


def refund(order: Order) -> Payment:
    """Record a full mock refund of the order's total (requirement 9.7)."""
    payment = record_payment(
        order,
        order.total_cents,
        "refunded",
        f"refund-{order.order_number}-{utcnow().strftime('%Y%m%d%H%M%S')}",
    )
    order.payment_status = "refunded"
    return payment


__all__ = ["charge", "record_payment", "refund", "PAYMENT_FAILED_MESSAGE"]
