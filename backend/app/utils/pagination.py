"""Page and per-page parsing with the ``meta`` block of the API contract."""

from __future__ import annotations

from typing import Any

from flask import request
from sqlalchemy import Select
from sqlalchemy.orm import Query

DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


def _positive_int(value: str | None, default: int) -> int:
    try:
        parsed = int(value) if value is not None else default
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def page_args(default_per_page: int = DEFAULT_PER_PAGE) -> tuple[int, int]:
    """Return ``(page, per_page)`` from the query string."""
    page = _positive_int(request.args.get("page"), 1)
    per_page = _positive_int(request.args.get("per_page"), default_per_page)
    return page, min(per_page, MAX_PER_PAGE)


def pagination_meta(page: int, per_page: int, total: int) -> dict[str, int]:
    """Build ``{page, per_page, total, total_pages}``."""
    total_pages = (total + per_page - 1) // per_page if per_page else 0
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
    }


def paginate(query: Query | Select, page: int, per_page: int) -> tuple[list[Any], dict[str, int]]:
    """Run a SQLAlchemy query for one page and return the rows and the meta."""
    if isinstance(query, Query):
        total = query.order_by(None).count()
        rows = query.offset((page - 1) * per_page).limit(per_page).all()
    else:
        from ..extensions import db

        total = db.session.execute(
            query.with_only_columns(query.selected_columns[0]).order_by(None)
        ).scalar()
        total = int(total or 0)
        rows = db.session.execute(
            query.offset((page - 1) * per_page).limit(per_page)
        ).scalars().all()
    return list(rows), pagination_meta(page, per_page, total)


__all__ = ["page_args", "pagination_meta", "paginate", "DEFAULT_PER_PAGE", "MAX_PER_PAGE"]
