"""Public catalog: products, search, details, reviews, categories and brands."""

from __future__ import annotations

from flask import Blueprint, request

from ...middleware.auth import auth_required
from ...schemas import ReviewSchema, load_or_raise
from ...services import catalog_service, review_service
from ...utils.pagination import page_args
from ...utils.permissions import require_user
from ...utils.responses import created, ok, paginated

bp = Blueprint("catalog", __name__, url_prefix="/api/v1")


@bp.get("/products")
def list_products():  # noqa: ANN202
    params = {
        "q": request.args.get("q"),
        "category": request.args.get("category"),
        "brand": request.args.get("brand"),
        "min_price": _int_arg("min_price"),
        "max_price": _int_arg("max_price"),
        "in_stock": _bool_arg("in_stock"),
        "min_rating": _float_arg("min_rating"),
        "sort": request.args.get("sort"),
        "page": _int_arg("page") or 1,
        "per_page": _int_arg("per_page") or 12,
    }
    items, meta = catalog_service.list_products(params)
    return paginated(items, meta)


@bp.get("/products/search")
def search_products():  # noqa: ANN202
    return ok({"suggestions": catalog_service.search(request.args.get("q"))})


@bp.get("/products/<identifier>")
def product_details(identifier: str):  # noqa: ANN202
    return ok(catalog_service.product_details(identifier))


@bp.get("/products/<identifier>/reviews")
def product_reviews(identifier: str):  # noqa: ANN202
    page, per_page = page_args(default_per_page=10)
    items, meta = catalog_service.product_reviews(identifier, page, per_page)
    return paginated(items, meta)


@bp.post("/products/<int:product_id>/reviews")
@auth_required
def submit_review(product_id: int):  # noqa: ANN202
    data = load_or_raise(ReviewSchema(), request.get_json(silent=True))
    return created({"review": review_service.submit(require_user(), product_id, data)})


@bp.get("/categories")
def categories():  # noqa: ANN202
    return ok({"data": catalog_service.category_tree()})


@bp.get("/brands")
def brands():  # noqa: ANN202
    return ok({"data": catalog_service.brand_list()})


def _int_arg(name: str) -> int | None:
    value = request.args.get(name)
    try:
        return int(value) if value not in (None, "") else None
    except ValueError:
        return None


def _float_arg(name: str) -> float | None:
    value = request.args.get(name)
    try:
        return float(value) if value not in (None, "") else None
    except ValueError:
        return None


def _bool_arg(name: str) -> bool | None:
    value = request.args.get(name)
    if value is None or value == "":
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}


__all__ = ["bp"]
