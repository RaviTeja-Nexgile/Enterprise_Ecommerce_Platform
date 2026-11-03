"""Checkout summary and order placement."""

from __future__ import annotations

from flask import Blueprint, request

from ...middleware.auth import auth_required
from ...schemas import PlaceOrderSchema, load_or_raise
from ...services import checkout_service
from ...utils.permissions import require_user
from ...utils.responses import created, ok

bp = Blueprint("checkout", __name__, url_prefix="/api/v1/checkout")


@bp.get("/summary")
@auth_required
def summary():  # noqa: ANN202
    return ok(
        checkout_service.summary(
            require_user(),
            coupon_code=request.args.get("coupon_code"),
            delivery_method=request.args.get("delivery_method") or "standard",
        )
    )


@bp.post("/place-order")
@auth_required
def place_order():  # noqa: ANN202
    data = load_or_raise(PlaceOrderSchema(), request.get_json(silent=True))
    return created({"order": checkout_service.place_order(require_user(), data)})


__all__ = ["bp"]
