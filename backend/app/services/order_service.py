"""Order history, details, cancellation and status transitions."""

from __future__ import annotations

from typing import Any

from ..errors import BusinessRuleError, NotFoundError, PermissionError
from ..extensions import db
from ..models import Order, OrderStatusHistory, User, utcnow
from ..repositories import catalog_repo, order_repo
from ..utils.audit import write_audit_log
from ..utils.pagination import pagination_meta
from . import payment_service
from .serializers import order_dict, status_history_dict

CANCEL_REFUSED_MESSAGE = "This order can no longer be cancelled"
INVALID_TRANSITION_MESSAGE = "This status change is not allowed"

CANCELLABLE = {"pending", "confirmed", "processing"}
NEXT_STATUS = {
    "pending": "confirmed",
    "confirmed": "processing",
    "processing": "shipped",
    "shipped": "delivered",
}


def _history(order: Order) -> list[dict[str, Any]]:
    entries = sorted(order.status_history, key=lambda entry: (entry.changed_at, entry.id))
    result = []
    for entry in entries:
        person = None
        if entry.changed_by:
            user = order_repo.user_by_id(entry.changed_by)
            person = user.full_name if user else None
        result.append(status_history_dict(entry, changed_by=person))
    return result


def _payment(order: Order):
    return order_repo.latest_payment(order.id)


def order_payload(order: Order, *, customer: dict[str, Any] | None = None) -> dict[str, Any]:
    return order_dict(order, payment=_payment(order), history=_history(order), customer=customer)


def list_orders(user: User, page: int, per_page: int = 10) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """The customer's orders, newest first (requirement 9.5)."""
    query = order_repo.orders_for_user(user.id)
    total = order_repo.count(query)
    orders = order_repo.page(query, page, per_page)
    return [order_payload(order) for order in orders], pagination_meta(page, per_page, total)


def get_order_for_user(user: User, order_id: int) -> dict[str, Any]:
    """An order the customer owns; anyone else's answers 403 (requirement 2.8)."""
    order = order_repo.get_order(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    if order.user_id != user.id:
        raise PermissionError()
    return order_payload(order)


def release_stock(order: Order, reason: str, user_id: int | None = None) -> None:
    """Return every reserved unit of the order to the available stock."""
    for item in order.items:
        inventory = catalog_repo.inventory_for(item.product_id, item.variant_id)
        if inventory is None:
            continue
        inventory.reserved_quantity = max(inventory.reserved_quantity - item.quantity, 0)
        catalog_repo.add_movement(inventory, item.quantity, reason, user_id)


def cancel_order(user: User, order_id: int) -> dict[str, Any]:
    """Cancel an unshipped order, release stock and refund in full (requirement 9.7)."""
    order = order_repo.get_order(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    if order.user_id != user.id:
        raise PermissionError()
    if order.status not in CANCELLABLE:
        raise BusinessRuleError(CANCEL_REFUSED_MESSAGE, code="cannot_cancel")

    order.status = "cancelled"
    release_stock(order, f"Order {order.order_number} cancelled", user.id)
    payment_service.refund(order)
    order_repo.add_status_history(
        OrderStatusHistory(
            order_id=order.id,
            status="cancelled",
            changed_by=user.id,
            changed_at=utcnow(),
            note="Order cancelled by the customer",
        )
    )
    write_audit_log(
        "order.cancelled",
        "order",
        order.id,
        user_id=user.id,
        details={"order_number": order.order_number},
    )
    db.session.commit()
    return order_payload(order)


def change_status(order: Order, new_status: str, actor: User) -> dict[str, Any]:
    """Move an order along its statuses (requirement 15.3, 15.4)."""
    current = order.status
    allowed = False
    if new_status == "cancelled" and current in CANCELLABLE:
        allowed = True
    elif new_status == "refunded" and current == "delivered":
        allowed = True
    elif NEXT_STATUS.get(current) == new_status:
        allowed = True
    if not allowed:
        raise BusinessRuleError(INVALID_TRANSITION_MESSAGE, code="invalid_transition")

    if new_status == "cancelled":
        release_stock(order, f"Order {order.order_number} cancelled", actor.id)
        payment_service.refund(order)
    elif new_status == "refunded":
        payment_service.refund(order)
    elif new_status in {"confirmed", "processing", "shipped", "delivered"}:
        order.payment_status = "success"

    order.status = new_status
    order_repo.add_status_history(
        OrderStatusHistory(
            order_id=order.id,
            status=new_status,
            changed_by=actor.id,
            changed_at=utcnow(),
            note=f"Status set to {new_status}",
        )
    )
    write_audit_log(
        "order.status_changed",
        "order",
        order.id,
        user_id=actor.id,
        details={"from": current, "to": new_status},
    )
    db.session.commit()
    return order_payload(order)


def refund_order(order: Order, actor: User) -> dict[str, Any]:
    """Refund a delivered order in full (requirement 15.6)."""
    if order.status != "delivered":
        raise BusinessRuleError(INVALID_TRANSITION_MESSAGE, code="invalid_transition")
    order.status = "refunded"
    payment_service.refund(order)
    order_repo.add_status_history(
        OrderStatusHistory(
            order_id=order.id,
            status="refunded",
            changed_by=actor.id,
            changed_at=utcnow(),
            note="Order refunded",
        )
    )
    write_audit_log(
        "order.refunded", "order", order.id, user_id=actor.id, details={"amount_cents": order.total_cents}
    )
    db.session.commit()
    return order_payload(order)


__all__ = [
    "order_payload",
    "list_orders",
    "get_order_for_user",
    "cancel_order",
    "change_status",
    "refund_order",
    "release_stock",
    "CANCEL_REFUSED_MESSAGE",
    "INVALID_TRANSITION_MESSAGE",
]
