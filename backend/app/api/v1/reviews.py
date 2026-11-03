"""Customer reviews and the product rating summary."""

from __future__ import annotations

from flask import Blueprint

from ...services import catalog_service
from ...utils.responses import ok

bp = Blueprint("reviews", __name__, url_prefix="/api/v1/reviews")


@bp.get("/products/<identifier>/summary")
def rating_summary(identifier: str):  # noqa: ANN202
    """The average rating and the count of each star for a product."""
    details = catalog_service.product_details(identifier)
    return ok(details.get("rating_summary", {"average": 0.0, "count": 0, "counts": {}}))


__all__ = ["bp"]
