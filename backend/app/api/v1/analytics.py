"""Dashboard analytics: overview and sales."""

from __future__ import annotations

from flask import Blueprint, request

from ...middleware.auth import auth_required
from ...services import analytics_service
from ...utils.permissions import require_permission
from ...utils.responses import ok

bp = Blueprint("analytics", __name__, url_prefix="/api/v1/admin/analytics")


@bp.get("/overview")
@auth_required
@require_permission("dashboard.view")
def overview():  # noqa: ANN202
    return ok(analytics_service.overview(dict(request.args)))


@bp.get("/sales")
@auth_required
@require_permission("dashboard.view")
def sales():  # noqa: ANN202
    return ok(analytics_service.sales(dict(request.args)))


__all__ = ["bp"]
