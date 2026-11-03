"""Dashboard KPIs, revenue trend and sales grouping (requirement 11)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from ..repositories import admin_repo, order_repo


def _parse(value: str | None, default: datetime) -> datetime:
    if not value:
        return default
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except ValueError:
        return default


def _range(params: dict[str, Any]) -> tuple[datetime, datetime]:
    now = datetime.utcnow()
    start = _parse(params.get("from"), now - timedelta(days=30))
    end = _parse(params.get("to"), now)
    return start, end


def _bucket_key(moment: datetime, group_by: str) -> str:
    if group_by == "week":
        year, week, _ = moment.isocalendar()
        return f"{year}-W{week:02d}"
    if group_by == "month":
        return moment.strftime("%Y-%m")
    if group_by == "quarter":
        return f"{moment.year}-Q{(moment.month - 1) // 3 + 1}"
    if group_by == "year":
        return moment.strftime("%Y")
    return moment.strftime("%Y-%m-%d")


def revenue_trend(start: datetime, end: datetime, group_by: str = "day") -> list[dict[str, Any]]:
    buckets: dict[str, int] = {}
    for order in admin_repo.orders_in_range(start, end):
        if order.status in {"cancelled", "refunded"}:
            continue
        key = _bucket_key(order.placed_at, group_by)
        buckets[key] = buckets.get(key, 0) + order.total_cents
    return [{"period": key, "revenue_cents": value} for key, value in sorted(buckets.items())]


def overview(params: dict[str, Any]) -> dict[str, Any]:
    """Every KPI card, the trend and the recent lists (requirement 11.1-11.5)."""
    start, end = _range(params)
    span = end - start
    previous_start = start - span
    previous_end = start

    revenue = admin_repo.revenue_in_range(start, end)
    previous_revenue = admin_repo.revenue_in_range(previous_start, previous_end)
    order_count = admin_repo.count_orders_in_range(start, end)
    change = (
        round((revenue - previous_revenue) / previous_revenue * 100, 1)
        if previous_revenue
        else (100.0 if revenue else 0.0)
    )

    recent = admin_repo.recent_orders(5)
    recent_customers = admin_repo.recent_customers(5)
    return {
        "range": {"from": start.isoformat(), "to": end.isoformat()},
        "kpis": {
            "total_revenue_cents": revenue,
            "total_orders": order_count,
            "total_customers": admin_repo.count_customers(),
            "total_products": admin_repo.count_products_all(),
            "average_order_value_cents": round(revenue / order_count) if order_count else 0,
            "pending_orders": admin_repo.count_orders_by_status("pending"),
            "low_stock_products": admin_repo.low_stock_count(),
            "out_of_stock_products": admin_repo.out_of_stock_count(),
        },
        "revenue_trend": revenue_trend(start, end, params.get("group_by") or "day"),
        "top_products": [
            {"name": name, "quantity": quantity, "revenue_cents": total}
            for name, quantity, total in admin_repo.top_products(start, end)
        ],
        "top_categories": [
            {"name": name, "revenue_cents": total}
            for name, total in admin_repo.top_categories(start, end)
        ],
        "recent_orders": [
            {
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "total_cents": order.total_cents,
                "placed_at": order.placed_at.isoformat() if order.placed_at else None,
            }
            for order in recent
        ],
        "recent_customers": [
            {
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "registered_at": user.created_at.isoformat() if user.created_at else None,
            }
            for user in recent_customers
        ],
        "previous_period": {
            "revenue_cents": previous_revenue,
            "change_percent": change,
        },
    }


def sales(params: dict[str, Any]) -> dict[str, Any]:
    """Revenue grouped by day, week, month, quarter or year (requirement 11.4)."""
    start, end = _range(params)
    group_by = params.get("group_by") or "day"
    if group_by not in {"day", "week", "month", "quarter", "year"}:
        group_by = "day"
    return {
        "group_by": group_by,
        "range": {"from": start.isoformat(), "to": end.isoformat()},
        "series": revenue_trend(start, end, group_by),
    }


__all__ = ["overview", "sales", "revenue_trend"]
