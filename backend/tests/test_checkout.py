"""Checkout: summary, stock reservation, mock payment, orders and cancellation."""

from __future__ import annotations

import threading
from datetime import timedelta

from sqlalchemy import select

from app.extensions import db
from app.models import Coupon, Inventory, Order, Product, utcnow

from helpers import (
    auth_headers,
    login,
    make_category,
    make_product,
    make_user,
    seed_roles,
    token_for,
)

SUMMARY = "/api/v1/checkout/summary"
PLACE = "/api/v1/checkout/place-order"
ORDERS = "/api/v1/orders"

ADDRESS = {
    "line1": "10 Market Street",
    "city": "Portland",
    "state": "OR",
    "postal_code": "97201",
    "country": "United States",
}
CARD = {"card_number": "4242424242424242", "expiry": "12/40", "cvc": "123"}


def _shop(app, stock: int = 5):
    with app.app_context():
        seed_roles()
        make_user("buyer@example.com")
        category = make_category("Electronics", "electronics")
        product = make_product(
            "Checkout Item",
            sku="SKU-CHECKOUT",
            slug="checkout-item",
            price_cents=5000,
            stock=stock,
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
        db.session.commit()
        return product.id


def _headers(client, email: str = "buyer@example.com"):
    return auth_headers(login(client, email)["access_token"])


def _add(client, headers, product_id: int, quantity: int = 1):
    response = client.post(
        "/api/v1/cart/items", json={"product_id": product_id, "quantity": quantity}, headers=headers
    )
    assert response.status_code == 201, response.get_json()


def _place(client, headers, **overrides):
    body = {
        "shipping_address": ADDRESS,
        "billing_address": ADDRESS,
        "delivery_method": "standard",
        "payment": CARD,
    }
    body.update(overrides)
    return client.post(PLACE, json=body, headers=headers)


def test_summary_calculates_every_total(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 2)
    body = client.get(SUMMARY, headers=headers).get_json()
    assert body["subtotal_cents"] == 10000
    assert body["discount_cents"] == 0
    assert body["shipping_cents"] == 0  # Standard is free from 100.00 USD
    assert body["tax_cents"] == 800
    assert body["total_cents"] == 10800
    assert {method["code"] for method in body["delivery_methods"]} == {
        "standard",
        "express",
        "next_day",
    }


def test_summary_applies_a_coupon(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 2)
    body = client.get(SUMMARY, query_string={"coupon_code": "TENOFF"}, headers=headers).get_json()
    assert body["discount_cents"] == 1000
    assert body["tax_cents"] == round((10000 - 1000) * 8 / 100)


def test_express_delivery_adds_its_fee(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    body = client.get(SUMMARY, query_string={"delivery_method": "express"}, headers=headers).get_json()
    assert body["shipping_cents"] == 1200


def test_place_order_reserves_stock_and_confirms(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 2)
    response = _place(client, headers)
    assert response.status_code == 201, response.get_json()
    order = response.get_json()["order"]
    assert order["status"] == "confirmed"
    assert order["payment_status"] == "success"
    assert order["order_number"].startswith("ORD-")
    assert order["total_cents"] == 10800
    assert len(order["items"]) == 1

    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id, Inventory.variant_id.is_(None))
        ).scalar_one()
        assert inventory.reserved_quantity == 2
        assert inventory.available_quantity == 3

    # The cart is emptied by the order.
    assert client.get("/api/v1/cart", headers=headers).get_json()["items"] == []


def test_place_order_refuses_more_than_the_stock(app, client):
    product_id = _shop(app, stock=1)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id, Inventory.variant_id.is_(None))
        ).scalar_one()
        inventory.quantity = 0
        db.session.commit()

    response = _place(client, headers)
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "out_of_stock"
    assert error["message"] == "Some items are no longer available"
    assert error["items"]

    with app.app_context():
        assert db.session.execute(select(Order)).scalars().all() == []


def test_failed_payment_releases_the_stock(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 2)
    response = _place(client, headers, payment={"card_number": "4242424242420000", "expiry": "12/40", "cvc": "123"})
    assert response.status_code == 402
    assert response.get_json()["error"]["message"] == "Payment was not completed"

    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id, Inventory.variant_id.is_(None))
        ).scalar_one()
        assert inventory.reserved_quantity == 0
        order = db.session.execute(select(Order)).scalar_one()
        assert order.status == "pending"
        assert order.payment_status == "failed"


def test_cancelled_payment_marks_the_order_cancelled(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    response = _place(client, headers, payment={"card_number": "4242424242429999", "expiry": "12/40", "cvc": "123"})
    assert response.status_code == 402
    with app.app_context():
        order = db.session.execute(select(Order)).scalar_one()
        assert order.payment_status == "cancelled"


def test_payment_refuses_an_expired_card(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    response = _place(client, headers, payment={"card_number": "4242424242424242", "expiry": "01/20", "cvc": "123"})
    assert response.status_code == 402


def test_order_history_lists_the_customers_orders(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    placed = _place(client, headers).get_json()["order"]

    body = client.get(ORDERS, headers=headers).get_json()
    assert body["meta"]["per_page"] == 10
    assert [order["id"] for order in body["data"]] == [placed["id"]]

    detail = client.get(f"{ORDERS}/{placed['id']}", headers=headers).get_json()
    assert detail["order_number"] == placed["order_number"]
    assert detail["shipping_address"]["line1"] == "10 Market Street"
    assert detail["payment"]["status"] == "success"


def test_another_customers_order_answers_403(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    placed = _place(client, headers).get_json()["order"]

    with app.app_context():
        make_user("other@example.com")
        db.session.commit()
    # Sign in on a throwaway client so the first customer's session stays.
    other_headers = auth_headers(token_for(app, "other@example.com"))
    response = client.get(f"{ORDERS}/{placed['id']}", headers=other_headers)
    assert response.status_code == 403
    assert response.get_json()["error"]["message"] == "You do not have permission to do this"


def test_cancel_releases_stock_and_refunds(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 2)
    placed = _place(client, headers).get_json()["order"]

    response = client.post(f"{ORDERS}/{placed['id']}/cancel", headers=headers)
    assert response.status_code == 200
    order = response.get_json()
    assert order["status"] == "cancelled"
    assert order["payment_status"] == "refunded"

    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id, Inventory.variant_id.is_(None))
        ).scalar_one()
        assert inventory.reserved_quantity == 0


def test_cancel_refuses_a_shipped_order(app, client):
    product_id = _shop(app)
    headers = _headers(client)
    _add(client, headers, product_id, 1)
    placed = _place(client, headers).get_json()["order"]
    with app.app_context():
        order = db.session.get(Order, placed["id"])
        order.status = "shipped"
        db.session.commit()

    response = client.post(f"{ORDERS}/{placed['id']}/cancel", headers=headers)
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "cannot_cancel"
    assert error["message"] == "This order can no longer be cancelled"


def test_two_orders_for_the_last_unit_confirm_only_one(app, client):
    """Requirement 16.6: two threads, one unit, one order."""
    product_id = _shop(app, stock=2)
    with app.app_context():
        make_user("second@example.com")
        db.session.commit()

    first_headers = _headers(client)
    second_headers = auth_headers(token_for(app, "second@example.com"))
    _add(client, first_headers, product_id, 1)
    _add(client, second_headers, product_id, 1)

    # Only one unit is left when both customers confirm.
    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id, Inventory.variant_id.is_(None))
        ).scalar_one()
        inventory.quantity = 1
        db.session.commit()

    results: list[int] = []
    lock = threading.Lock()

    def place(headers):
        response = _place(client, headers)
        with lock:
            results.append(response.status_code)

    threads = [
        threading.Thread(target=place, args=(first_headers,)),
        threading.Thread(target=place, args=(second_headers,)),
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert sorted(results) == [201, 422]
    with app.app_context():
        confirmed = db.session.execute(
            select(Order).where(Order.status == "confirmed")
        ).scalars().all()
        assert len(confirmed) == 1
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id, Inventory.variant_id.is_(None))
        ).scalar_one()
        assert inventory.reserved_quantity == 1
