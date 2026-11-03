"""Public catalog: products, search, details, categories, brands and home."""

from __future__ import annotations

from typing import Any

from ..errors import NotFoundError, ValidationError
from ..extensions import db
from ..models import NewsletterSubscriber, Product
from ..repositories import catalog_repo
from ..utils.pagination import pagination_meta
from .serializers import (
    brand_dict,
    category_dict,
    product_detail,
    product_summary,
    review_dict,
    variant_dict,
)


def _summary(product: Product) -> dict[str, Any]:
    available = catalog_repo.available_quantity(product.id, None)
    return product_summary(product, available_quantity=available)


def list_products(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """The catalog page: filters, sort and pagination (requirement 4)."""
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 12), 1), 100)
    query = catalog_repo.product_query(
        q=params.get("q"),
        category=params.get("category"),
        brand=params.get("brand"),
        min_price=params.get("min_price"),
        max_price=params.get("max_price"),
        in_stock=params.get("in_stock"),
        min_rating=params.get("min_rating"),
        sort=params.get("sort") or "newest",
    )
    total = catalog_repo.count_products(query)
    products = catalog_repo.page_products(query, page, per_page)
    return [_summary(product) for product in products], pagination_meta(page, per_page, total)


def search(q: str | None) -> list[dict[str, Any]]:
    """Up to 6 suggestions for the search bar (requirement 4.2)."""
    if not q or len(q.strip()) < 2:
        return []
    results = catalog_repo.search_products(q.strip(), limit=6)
    return [
        {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "image_url": catalog_repo.first_image_url(product),
            "price_cents": product.effective_price_cents,
        }
        for product in results
    ]


def product_details(identifier: str) -> dict[str, Any]:
    """A product with images, variants, reviews and related products (requirement 5)."""
    product = catalog_repo.get_product(identifier)
    if product is None:
        raise NotFoundError("The requested product was not found")

    variants = [
        variant_dict(
            variant,
            available=catalog_repo.available_quantity(product.id, variant.id),
        )
        for variant in product.variants
        if variant.status == "published"
    ]
    reviews = [
        review_dict(review, author=None) for review in catalog_repo.approved_reviews(product.id)
    ]
    related = [_summary(item) for item in catalog_repo.related_products(product)]
    rating_summary = _rating_summary(product.id)
    return product_detail(
        product,
        available_quantity=catalog_repo.available_quantity(product.id, None),
        variants=variants,
        reviews=reviews,
        related=related,
        rating_summary=rating_summary,
    )


def _rating_summary(product_id: int) -> dict[str, Any]:
    reviews = catalog_repo.approved_reviews(product_id)
    counts = {str(star): 0 for star in range(1, 6)}
    for review in reviews:
        counts[str(review.rating)] = counts.get(str(review.rating), 0) + 1
    average = round(sum(review.rating for review in reviews) / len(reviews), 1) if reviews else 0.0
    return {"average": average, "count": len(reviews), "counts": counts}


def product_reviews(identifier: str, page: int, per_page: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
    product = catalog_repo.get_product(identifier)
    if product is None:
        raise NotFoundError("The requested product was not found")
    reviews = catalog_repo.approved_reviews(product.id)
    total = len(reviews)
    start = (page - 1) * per_page
    return (
        [review_dict(review) for review in reviews[start : start + per_page]],
        pagination_meta(page, per_page, total),
    )


def category_tree() -> list[dict[str, Any]]:
    """Active categories as a tree with product counts (requirement 4)."""
    categories = catalog_repo.active_categories()
    by_parent: dict[int | None, list[Any]] = {}
    for category in categories:
        by_parent.setdefault(category.parent_id, []).append(category)

    def build(parent_id: int | None) -> list[dict[str, Any]]:
        nodes = []
        for category in by_parent.get(parent_id, []):
            node = category_dict(
                category, product_count=catalog_repo.product_count_for_category(category.id)
            )
            node["children"] = build(category.id)
            nodes.append(node)
        return nodes

    return build(None)


def brand_list() -> list[dict[str, Any]]:
    return [brand_dict(brand) for brand in catalog_repo.brands()]


def storefront_home() -> dict[str, Any]:
    """The home page sections, at most 8 products each (requirement 3)."""
    categories = catalog_repo.active_categories()[:6]
    return {
        "hero": {
            "title": "Everything you need, delivered",
            "subtitle": "Curated products from brands you can trust, at prices that make sense.",
            "image_url": categories[0].image_url if categories else None,
            "cta": "Shop the catalog",
        },
        "featured_categories": [
            category_dict(
                category, product_count=catalog_repo.product_count_for_category(category.id)
            )
            for category in categories
        ],
        "trending": [_summary(product) for product in catalog_repo.featured_products(8)],
        "best_selling": [_summary(product) for product in catalog_repo.best_selling_products(8)],
        "new_arrivals": [_summary(product) for product in catalog_repo.new_arrival_products(8)],
        "offers": [_summary(product) for product in catalog_repo.discounted_products(8)],
        "testimonials": [
            {"name": "Jordan L.", "quote": "Fast delivery and the quality is excellent.", "rating": 5},
            {"name": "Priya P.", "quote": "My new favourite place to shop.", "rating": 5},
            {"name": "Sam R.", "quote": "Great prices and a simple checkout.", "rating": 4},
        ],
    }


def subscribe_newsletter(email: str) -> None:
    """Store a newsletter email (requirement 3.5)."""
    normalized = email.strip().lower()
    if "@" not in normalized or "." not in normalized.split("@")[-1]:
        raise ValidationError("Enter a valid email address", fields={"email": "Enter a valid email address"})
    existing = db.session.query(NewsletterSubscriber).filter_by(email=normalized).first()
    if existing is None:
        db.session.add(NewsletterSubscriber(email=normalized))
        db.session.commit()


__all__ = [
    "list_products",
    "search",
    "product_details",
    "product_reviews",
    "category_tree",
    "brand_list",
    "storefront_home",
    "subscribe_newsletter",
]
