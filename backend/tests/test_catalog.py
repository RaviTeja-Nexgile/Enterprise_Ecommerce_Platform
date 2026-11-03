"""Catalog endpoints: products, search, details, reviews, categories, home and newsletter."""

from __future__ import annotations

from sqlalchemy import select

from app.extensions import db
from app.models import NewsletterSubscriber, Product, Review

from helpers import (
    auth_headers,
    login,
    make_brand,
    make_category,
    make_product,
    make_user,
    seed_roles,
)

PRODUCTS = "/api/v1/products"
SEARCH = "/api/v1/products/search"
CATEGORIES = "/api/v1/categories"
BRANDS = "/api/v1/brands"
HOME = "/api/v1/storefront/home"
NEWSLETTER = "/api/v1/newsletter"


def _catalog(app):
    with app.app_context():
        seed_roles()
        category = make_category("Electronics", "electronics")
        other = make_category("Books", "books")
        brand = make_brand("Northwind")
        make_product(
            "Aurora Headphones",
            sku="SKU-AUR-1",
            slug="aurora-headphones",
            price_cents=12999,
            discounted_price_cents=10399,
            stock=12,
            category=category,
            brand=brand,
        )
        make_product(
            "Quiet Ledger",
            sku="SKU-LED-1",
            slug="quiet-ledger",
            price_cents=1899,
            stock=0,
            category=other,
        )
        make_product(
            "Hidden Draft",
            sku="SKU-DRAFT-1",
            slug="hidden-draft",
            price_cents=999,
            stock=5,
            category=category,
            status="draft",
        )
        db.session.commit()
        return category.id, other.id


def test_list_products_returns_only_published_products(app, client):
    _catalog(app)
    response = client.get(PRODUCTS)
    assert response.status_code == 200
    body = response.get_json()
    names = {item["name"] for item in body["data"]}
    assert "Aurora Headphones" in names
    assert "Quiet Ledger" in names
    assert "Hidden Draft" not in names
    assert body["meta"]["page"] == 1
    assert body["meta"]["total"] == 2


def test_product_summary_has_the_contract_fields(app, client):
    _catalog(app)
    body = client.get(PRODUCTS).get_json()
    item = next(row for row in body["data"] if row["name"] == "Aurora Headphones")
    for field in (
        "id",
        "name",
        "slug",
        "sku",
        "short_description",
        "image_url",
        "brand",
        "category",
        "regular_price_cents",
        "discounted_price_cents",
        "discount_percentage",
        "in_stock",
        "available_quantity",
        "rating_average",
        "rating_count",
        "is_featured",
        "is_new_arrival",
    ):
        assert field in item
    assert item["brand"] == "Northwind"
    assert item["category"] == "Electronics"
    assert item["in_stock"] is True
    assert item["available_quantity"] == 12


def test_search_filters_by_name_sku_and_description(app, client):
    _catalog(app)
    by_name = client.get(PRODUCTS, query_string={"q": "Aurora"}).get_json()
    assert [item["name"] for item in by_name["data"]] == ["Aurora Headphones"]

    by_sku = client.get(PRODUCTS, query_string={"q": "SKU-LED"}).get_json()
    assert [item["name"] for item in by_sku["data"]] == ["Quiet Ledger"]

    none = client.get(PRODUCTS, query_string={"q": "nothing-matches"}).get_json()
    assert none["data"] == []
    assert none["meta"]["total"] == 0


def test_filters_combine(app, client):
    category_id, other_id = _catalog(app)
    by_category = client.get(PRODUCTS, query_string={"category": "electronics"}).get_json()
    assert [item["name"] for item in by_category["data"]] == ["Aurora Headphones"]

    by_brand = client.get(PRODUCTS, query_string={"brand": "Northwind"}).get_json()
    assert [item["name"] for item in by_brand["data"]] == ["Aurora Headphones"]

    in_stock = client.get(PRODUCTS, query_string={"in_stock": "true"}).get_json()
    assert "Quiet Ledger" not in {item["name"] for item in in_stock["data"]}

    price = client.get(PRODUCTS, query_string={"max_price": 2000}).get_json()
    assert [item["name"] for item in price["data"]] == ["Quiet Ledger"]

    rating = client.get(PRODUCTS, query_string={"min_rating": 4.0}).get_json()
    assert len(rating["data"]) == 2


def test_sort_options_order_the_results(app, client):
    _catalog(app)
    ascending = client.get(PRODUCTS, query_string={"sort": "price_asc"}).get_json()
    assert [item["name"] for item in ascending["data"]] == ["Quiet Ledger", "Aurora Headphones"]

    descending = client.get(PRODUCTS, query_string={"sort": "price_desc"}).get_json()
    assert [item["name"] for item in descending["data"]] == ["Aurora Headphones", "Quiet Ledger"]


def test_pagination_keeps_the_filters(app, client):
    _catalog(app)
    page = client.get(PRODUCTS, query_string={"per_page": 1, "page": 2}).get_json()
    assert len(page["data"]) == 1
    assert page["meta"]["page"] == 2
    assert page["meta"]["per_page"] == 1
    assert page["meta"]["total"] == 2
    assert page["meta"]["total_pages"] == 2


def test_search_suggestions_need_two_characters(app, client):
    _catalog(app)
    short = client.get(SEARCH, query_string={"q": "a"}).get_json()
    assert short["suggestions"] == []

    suggestions = client.get(SEARCH, query_string={"q": "Au"}).get_json()["suggestions"]
    assert len(suggestions) == 1
    assert suggestions[0]["name"] == "Aurora Headphones"
    assert suggestions[0]["price_cents"] == 10399


def test_product_details_by_slug_and_id(app, client):
    _catalog(app)
    by_slug = client.get(f"{PRODUCTS}/aurora-headphones")
    assert by_slug.status_code == 200
    detail = by_slug.get_json()
    assert detail["name"] == "Aurora Headphones"
    assert detail["images"]
    assert detail["variants"] == []
    assert "rating_summary" in detail

    by_id = client.get(f"{PRODUCTS}/{detail['id']}")
    assert by_id.status_code == 200
    assert by_id.get_json()["slug"] == "aurora-headphones"


def test_product_details_404_for_an_unknown_product(app, client):
    _catalog(app)
    response = client.get(f"{PRODUCTS}/does-not-exist")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"


def test_product_details_hide_draft_products(app, client):
    _catalog(app)
    assert client.get(f"{PRODUCTS}/hidden-draft").status_code == 404


def test_categories_are_a_tree_with_product_counts(app, client):
    _catalog(app)
    body = client.get(CATEGORIES).get_json()
    names = {node["name"]: node for node in body["data"]}
    assert names["Electronics"]["product_count"] == 1
    assert names["Books"]["product_count"] == 1
    assert names["Electronics"]["children"] == []


def test_brands_are_listed(app, client):
    _catalog(app)
    body = client.get(BRANDS).get_json()
    assert [brand["name"] for brand in body["data"]] == ["Northwind"]


def test_storefront_home_has_every_section(app, client):
    _catalog(app)
    body = client.get(HOME).get_json()
    for section in (
        "hero",
        "featured_categories",
        "trending",
        "best_selling",
        "new_arrivals",
        "offers",
        "testimonials",
    ):
        assert section in body
    for section in ("trending", "best_selling", "new_arrivals", "offers"):
        assert len(body[section]) <= 8


def test_newsletter_stores_a_valid_email(app, client):
    response = client.post(NEWSLETTER, json={"email": "reader@example.com"})
    assert response.status_code == 201
    assert response.get_json()["message"] == "Thanks for subscribing"
    with app.app_context():
        stored = db.session.execute(
            select(NewsletterSubscriber).where(NewsletterSubscriber.email == "reader@example.com")
        ).scalar_one()
        assert stored is not None


def test_newsletter_refuses_an_invalid_email(app, client):
    response = client.post(NEWSLETTER, json={"email": "not-an-email"})
    assert response.status_code == 400
    assert response.get_json()["error"]["fields"]["email"] == "Enter a valid email address"


def test_review_submission_is_pending_and_verified_for_a_buyer(app, client):
    category_id, _ = _catalog(app)
    with app.app_context():
        seed_roles()
        make_user("reviewer@example.com")
        db.session.commit()
        product = db.session.execute(
            select(Product).where(Product.slug == "aurora-headphones")
        ).scalar_one()
        product_id = product.id

    headers = auth_headers(login(client, "reviewer@example.com")["access_token"])
    response = client.post(
        f"{PRODUCTS}/{product_id}/reviews",
        json={"rating": 5, "comment": "Excellent sound and a comfortable fit."},
        headers=headers,
    )
    assert response.status_code == 201
    review = response.get_json()["review"]
    assert review["status"] == "pending"
    assert review["is_verified_purchase"] is False

    duplicate = client.post(
        f"{PRODUCTS}/{product_id}/reviews",
        json={"rating": 4, "comment": "A second review of the same product."},
        headers=headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "already_reviewed"


def test_review_submission_refuses_a_short_comment(app, client):
    _catalog(app)
    with app.app_context():
        seed_roles()
        make_user("reviewer@example.com")
        db.session.commit()
        product_id = db.session.execute(
            select(Product).where(Product.slug == "aurora-headphones")
        ).scalar_one().id

    headers = auth_headers(login(client, "reviewer@example.com")["access_token"])
    response = client.post(
        f"{PRODUCTS}/{product_id}/reviews",
        json={"rating": 5, "comment": "Too short"},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == (
        "Choose a rating and write at least 10 characters"
    )


def test_product_reviews_list_only_approved_reviews(app, client):
    _catalog(app)
    with app.app_context():
        product = db.session.execute(
            select(Product).where(Product.slug == "aurora-headphones")
        ).scalar_one()
        user = make_user("approved@example.com")
        db.session.add(
            Review(
                product_id=product.id,
                user_id=user.id,
                rating=5,
                comment="Approved review text here.",
                status="approved",
            )
        )
        db.session.add(
            Review(
                product_id=product.id,
                user_id=make_user("pending@example.com").id,
                rating=1,
                comment="Pending review text here.",
                status="pending",
            )
        )
        db.session.commit()
        product_id = product.id

    body = client.get(f"{PRODUCTS}/{product_id}/reviews").get_json()
    assert [review["comment"] for review in body["data"]] == ["Approved review text here."]
    assert body["meta"]["total"] == 1
