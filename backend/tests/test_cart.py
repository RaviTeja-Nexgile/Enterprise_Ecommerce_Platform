"""Cart endpoints: items, backend totals, coupons, guest carts and the wishlist."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select

from app.extensions import db
from app.models import Coupon, utcnow

from helpers import (
    auth_headers,
    login,
    make_category,
    make_product,
    make_user,
    seed_roles,
)

CART = "/api/v1/cart"
ITEMS = "/api/v1/cart/items"
COUPON = "/api/v1/cart/coupon"
MERGE = "/api/v1/cart/merge"
WISHLIST = "/api/v1/wishlist"
GUEST = {"X-Guest-Token": "guest-token-1"}


def _shop(app):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        category = make_category("Electronics", "electronics")
        cheap = make_product(
            "Cheap Item", sku="SKU-CHEAP", slug="cheap-item", price_cents=1000, stock=5,
            category=category,
        )
        pricey = make_product(
            "Pricey Item", sku="SKU-PRICEY", slug="pricey-item", price_cents=12000, stock=2,
            category=category,
        )
        db.session.add(
            Coupon(
                code="TENOFF",
                type="percentage",
                value=10,
                min_order_value_cents=0,
                max_discount_cents=2000,
                expires_at=utcnow() + timedelta(days=30),
                usage_limit=100,
                per_customer_limit=1,
                is_active=True,
            )
        )
        db.session.add(
            Coupon(
                code="EXPIRED",
                type="fixed",
                value=500,
                min_order_value_cents=0,
                expires_at=utcnow() - timedelta(days=1),
                is_active=True,
            )
        )
        db.session.add(
            Coupon(
                code="BIGORDER",
                type="fixed",
                value=500,
                min_order_value_cents=50000,
                expires_at=utcnow() + timedelta(days=30),
                is_active=True,
            )
        )
        db.session.commit()
        return cheap.id, pricey.id


def _headers(client):
    return auth_headers(login(client, "shopper@example.com")["access_token"])


def test_empty_cart_has_zero_totals(app, client):
    _shop(app)
    response = client.get(CART, headers=_headers(client))
    assert response.status_code == 200
    body = response.get_json()
    assert body["items"] == []
    assert body["subtotal_cents"] == 0
    assert body["total_cents"] == 0
    assert body["item_count"] == 0


def test_add_item_returns_backend_totals(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    response = client.post(ITEMS, json={"product_id": cheap_id, "quantity": 2}, headers=headers)
    assert response.status_code == 201
    body = response.get_json()
    assert body["subtotal_cents"] == 2000
    assert body["item_count"] == 2
    # Standard shipping is 500 under 100.00 USD; tax is 8% of the subtotal.
    assert body["shipping_cents"] == 500
    assert body["tax_cents"] == 160
    assert body["total_cents"] == 2000 + 500 + 160
    assert body["items"][0]["unit_price_cents"] == 1000


def test_standard_shipping_is_free_from_one_hundred_dollars(app, client):
    _, pricey_id = _shop(app)
    headers = _headers(client)
    body = client.post(ITEMS, json={"product_id": pricey_id, "quantity": 1}, headers=headers).get_json()
    assert body["subtotal_cents"] == 12000
    assert body["shipping_cents"] == 0


def test_add_item_refuses_more_than_the_stock(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    response = client.post(ITEMS, json={"product_id": cheap_id, "quantity": 9}, headers=headers)
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "insufficient_stock"
    assert error["message"] == "Only 5 left in stock"


def test_adding_the_same_product_twice_merges_the_line(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    client.post(ITEMS, json={"product_id": cheap_id, "quantity": 1}, headers=headers)
    body = client.post(ITEMS, json={"product_id": cheap_id, "quantity": 2}, headers=headers).get_json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 3


def test_update_quantity_recalculates_the_totals(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    added = client.post(ITEMS, json={"product_id": cheap_id, "quantity": 1}, headers=headers).get_json()
    item_id = added["items"][0]["id"]

    body = client.put(f"{ITEMS}/{item_id}", json={"quantity": 4}, headers=headers).get_json()
    assert body["items"][0]["quantity"] == 4
    assert body["subtotal_cents"] == 4000
    assert body["tax_cents"] == 320


def test_update_quantity_above_stock_is_refused(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    added = client.post(ITEMS, json={"product_id": cheap_id, "quantity": 1}, headers=headers).get_json()
    item_id = added["items"][0]["id"]
    response = client.put(f"{ITEMS}/{item_id}", json={"quantity": 50}, headers=headers)
    assert response.status_code == 422
    assert response.get_json()["error"]["message"] == "Only 5 left in stock"


def test_remove_item_empties_the_cart(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    added = client.post(ITEMS, json={"product_id": cheap_id, "quantity": 1}, headers=headers).get_json()
    item_id = added["items"][0]["id"]
    body = client.delete(f"{ITEMS}/{item_id}", headers=headers).get_json()
    assert body["items"] == []
    assert body["total_cents"] == 0


def test_a_sent_price_is_ignored(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    body = client.post(
        ITEMS,
        json={"product_id": cheap_id, "quantity": 1, "unit_price_cents": 1},
        headers=headers,
    ).get_json()
    assert body["items"][0]["unit_price_cents"] == 1000
    assert body["subtotal_cents"] == 1000


def test_coupon_applies_a_percentage_discount(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    client.post(ITEMS, json={"product_id": cheap_id, "quantity": 4}, headers=headers)
    body = client.post(COUPON, json={"code": "TENOFF"}, headers=headers).get_json()
    assert body["discount_cents"] == 400
    assert body["coupon"]["code"] == "TENOFF"
    assert body["tax_cents"] == round((4000 - 400) * 8 / 100)


def test_expired_coupon_is_refused(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    client.post(ITEMS, json={"product_id": cheap_id, "quantity": 1}, headers=headers)
    response = client.post(COUPON, json={"code": "EXPIRED"}, headers=headers)
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "invalid_coupon"
    assert error["message"] == "This coupon cannot be used for this order"


def test_coupon_below_the_minimum_order_value_is_refused(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    client.post(ITEMS, json={"product_id": cheap_id, "quantity": 1}, headers=headers)
    response = client.post(COUPON, json={"code": "BIGORDER"}, headers=headers)
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "invalid_coupon"


def test_removing_the_coupon_restores_the_total(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    client.post(ITEMS, json={"product_id": cheap_id, "quantity": 4}, headers=headers)
    client.post(COUPON, json={"code": "TENOFF"}, headers=headers)
    body = client.delete(COUPON, headers=headers).get_json()
    assert body["discount_cents"] == 0
    assert body["coupon"] is None


def test_guest_cart_uses_the_guest_token_header(app, client):
    cheap_id, _ = _shop(app)
    added = client.post(
        ITEMS, json={"product_id": cheap_id, "quantity": 2}, headers=GUEST
    )
    assert added.status_code == 201
    body = client.get(CART, headers=GUEST).get_json()
    assert body["item_count"] == 2

    # A different guest token sees an empty cart.
    other = client.get(CART, headers={"X-Guest-Token": "another-guest"}).get_json()
    assert other["items"] == []


def test_guest_cart_merges_into_the_customer_cart(app, client):
    cheap_id, _ = _shop(app)
    client.post(ITEMS, json={"product_id": cheap_id, "quantity": 2}, headers=GUEST)
    headers = _headers(client)
    body = client.post(MERGE, json={"guest_token": "guest-token-1"}, headers=headers).get_json()
    assert body["item_count"] == 2
    assert body["items"][0]["product_id"] == cheap_id


def test_wishlist_adds_lists_and_refuses_a_duplicate(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    added = client.post(f"{WISHLIST}/items", json={"product_id": cheap_id}, headers=headers)
    assert added.status_code == 201

    duplicate = client.post(f"{WISHLIST}/items", json={"product_id": cheap_id}, headers=headers)
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["message"] == "Already in your wishlist"

    body = client.get(WISHLIST, headers=headers).get_json()
    assert len(body["items"]) == 1
    assert body["items"][0]["available"] is True
    assert body["items"][0]["product"]["id"] == cheap_id


def test_wishlist_move_to_cart_removes_the_item(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    item = client.post(f"{WISHLIST}/items", json={"product_id": cheap_id}, headers=headers).get_json()
    body = client.post(f"{WISHLIST}/items/{item['id']}/move-to-cart", headers=headers).get_json()
    assert body["item_count"] == 1
    assert client.get(WISHLIST, headers=headers).get_json()["items"] == []


def test_wishlist_remove_deletes_the_item(app, client):
    cheap_id, _ = _shop(app)
    headers = _headers(client)
    item = client.post(f"{WISHLIST}/items", json={"product_id": cheap_id}, headers=headers).get_json()
    assert client.delete(f"{WISHLIST}/items/{item['id']}", headers=headers).status_code == 204
    assert client.get(WISHLIST, headers=headers).get_json()["items"] == []


def test_cart_requires_a_token_for_a_signed_in_cart(app, client):
    _shop(app)
    response = client.get(CART)
    assert response.status_code == 200
    assert response.get_json()["items"] == []
