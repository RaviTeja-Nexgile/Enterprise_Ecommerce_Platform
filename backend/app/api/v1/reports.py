"""Admin reports and their CSV export."""

from __future__ import annotations

from flask import Blueprint, Response, request

from ...middleware.auth import auth_required
from ...services import report_service
from ...utils.permissions import require_permission
from ...utils.responses import ok

bp = Blueprint("reports", __name__, url_prefix="/api/v1/admin/reports")


@bp.get("/<report_name>")
@auth_required
@require_permission("reports.view")
def report(report_name: str):  # noqa: ANN202
    return ok(report_service.report(report_name, dict(request.args)))


@bp.get("/<report_name>/export")
@auth_required
@require_permission("reports.view")
def export(report_name: str):  # noqa: ANN202
    csv_text = report_service.report_csv(report_name, dict(request.args))
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_name}.csv"},
    )


__all__ = ["bp"]
