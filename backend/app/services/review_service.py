"""Customer review submission (requirement 10)."""

from __future__ import annotations

from typing import Any

from ..errors import ConflictError, NotFoundError, ValidationError
from ..extensions import db
from ..models import Review, User
from ..repositories import catalog_repo, order_repo
from .serializers import review_dict

INVALID_REVIEW_MESSAGE = "Choose a rating and write at least 10 characters"


def submit(user: User, product_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """Save a pending review, one per product per customer (requirement 10.1)."""
    product = catalog_repo.get_product(product_id)
    if product is None:
        raise NotFoundError("The requested product was not found")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()
    if not rating or not 1 <= int(rating) <= 5 or len(comment) < 10:
        raise ValidationError(INVALID_REVIEW_MESSAGE, code="invalid_review")
    if order_repo.review_for(user.id, product_id) is not None:
        raise ConflictError("You have already reviewed this product", code="already_reviewed")

    review = Review(
        product_id=product_id,
        user_id=user.id,
        rating=int(rating),
        comment=comment,
        is_verified_purchase=order_repo.user_has_purchased(user.id, product_id),
        status="pending",
    )
    order_repo.add_review(review)
    db.session.commit()
    return review_dict(review)


__all__ = ["submit", "INVALID_REVIEW_MESSAGE"]
