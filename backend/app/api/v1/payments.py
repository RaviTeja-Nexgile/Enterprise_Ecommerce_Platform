"""Mock payment gateway and refunds."""

from __future__ import annotations

from flask import Blueprint, request

from ...errors import NotFoundError, PermissionError
from ...middleware.auth import auth_required
from ...repositories import order_repo
from ...services import order_service, payment_service
from ...utils.permissions import require_user
from ...utils.responses import ok

bp = Blueprint("payments", __name__, url_prefix="/api/v1/payments")


@bp.post("/charge")
@auth_required
def charge():  # noqa: ANN202
    """Run the mock gateway without creating an order (tests and tools)."""
    data = request.get_json(silent=True) or {}
    result = payment_service.charge(
        data.get("card_number", ""), data.get("expiry", ""), data.get("cvc", "")
    )
    return ok(result)


@bp.post("/orders/<int:order_id>/refund")
@auth_required
def refund(order_id: int):  # noqa: ANN202
    """Refund a delivered order in full.

    The order status rules of ``design.md`` allow a refund only from
    ``delivered``; a customer's own path for an unshipped order is
    cancellation, which releases stock and refunds at once.
    """
    user = require_user()
    order = order_repo.get_order(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    if order.user_id != user.id and "orders.manage" not in user.permission_names:
        raise PermissionError()
    result = order_service.refund_order(order, user)
    return ok(
        {
            "status": result["payment_status"],
            "amount_cents": order.total_cents,
            "order": result,
        }
    )


__all__ = ["bp"]
