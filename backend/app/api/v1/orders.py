"""The customer's order history, order details and cancellation."""

from __future__ import annotations

from flask import Blueprint

from ...middleware.auth import auth_required
from ...services import order_service
from ...utils.pagination import page_args
from ...utils.permissions import require_user
from ...utils.responses import ok, paginated

bp = Blueprint("orders", __name__, url_prefix="/api/v1/orders")


@bp.get("")
@auth_required
def list_orders():  # noqa: ANN202
    page, per_page = page_args(default_per_page=10)
    items, meta = order_service.list_orders(require_user(), page, per_page)
    return paginated(items, meta)


@bp.get("/<int:order_id>")
@auth_required
def get_order(order_id: int):  # noqa: ANN202
    return ok(order_service.get_order_for_user(require_user(), order_id))


@bp.post("/<int:order_id>/cancel")
@auth_required
def cancel_order(order_id: int):  # noqa: ANN202
    return ok(order_service.cancel_order(require_user(), order_id))


__all__ = ["bp"]
