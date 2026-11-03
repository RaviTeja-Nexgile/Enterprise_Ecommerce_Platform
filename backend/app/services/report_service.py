"""Report data and CSV export (requirement 18)."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from typing import Any

from ..errors import NotFoundError
from ..repositories import admin_repo
from . import analytics_service

REPORTS = {"revenue", "orders", "products", "categories", "customers", "inventory"}


def _range(params: dict[str, Any]) -> tuple[datetime, datetime]:
    now = datetime.utcnow()
    try:
        start = datetime.fromisoformat(str(params.get("from")).replace("Z", "")) if params.get("from") else now - timedelta(days=30)
    except ValueError:
        start = now - timedelta(days=30)
    try:
        end = datetime.fromisoformat(str(params.get("to")).replace("Z", "")) if params.get("to") else now
    except ValueError:
        end = now
    return start, end


def report_rows(name: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    """The rows of one report for the selected range."""
    if name not in REPORTS:
        raise NotFoundError("The requested report was not found")
    start, end = _range(params)

    if name == "revenue":
        group_by = params.get("group_by") or "day"
        return analytics_service.revenue_trend(start, end, group_by)
    if name == "orders":
        return [
            {
                "order_number": order.order_number,
                "status": order.status,
                "payment_status": order.payment_status,
                "total_cents": order.total_cents,
                "placed_at": order.placed_at.isoformat() if order.placed_at else None,
            }
            for order in admin_repo.orders_in_range(start, end)
        ]
    if name == "products":
        return [
            {"name": product_name, "quantity": quantity, "revenue_cents": total}
            for product_name, quantity, total in admin_repo.top_products(start, end, limit=100)
        ]
    if name == "categories":
        return [
            {"name": category_name, "revenue_cents": total}
            for category_name, total in admin_repo.top_categories(start, end, limit=100)
        ]
    if name == "customers":
        return [
            {
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "registered_at": user.created_at.isoformat() if user.created_at else None,
            }
            for user in admin_repo.recent_customers(100)
        ]
    return [
        {
            "product_id": row.product_id,
            "variant_id": row.variant_id,
            "quantity": row.quantity,
            "reserved_quantity": row.reserved_quantity,
            "available_quantity": row.available_quantity,
            "low_stock_threshold": row.low_stock_threshold,
        }
        for row in admin_repo.inventory_rows()
    ]


def report(name: str, params: dict[str, Any]) -> dict[str, Any]:
    rows = report_rows(name, params)
    return {"report": name, "rows": rows, "empty": len(rows) == 0}


def report_csv(name: str, params: dict[str, Any]) -> str:
    """CSV of the report's rows (requirement 18.4)."""
    rows = report_rows(name, params)
    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return buffer.getvalue()


__all__ = ["report", "report_csv", "report_rows", "REPORTS"]
