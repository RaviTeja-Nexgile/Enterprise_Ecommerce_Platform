"""Admin endpoints: permissions, products, categories, customers, orders,
inventory, coupons, reviews, users, audit, analytics and reports."""

from __future__ import annotations

import io
from datetime import timedelta
from html import escape

from sqlalchemy import select

from app.extensions import db
from app.models import (
    AuditLog,
    Category,
    Coupon,
    Inventory,
    InventoryMovement,
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
    Review,
    Role,
    User,
    utcnow,
)

from helpers import (
    ADMIN_PASSWORD,
    auth_headers,
    make_brand,
    make_category,
    make_product,
    make_user,
    seed_roles,
    token_for,
)

ADMIN = "/api/v1/admin"


def _admin(app, role: str = "Super Admin", email: str = "admin@example.com"):
    with app.app_context():
        roles = seed_roles()
        make_user(email, role=role, password=ADMIN_PASSWORD)
        db.session.commit()
    return auth_headers(token_for(app, email, ADMIN_PASSWORD))


def _headers(app, email: str = "admin@example.com"):
    return auth_headers(token_for(app, email, ADMIN_PASSWORD))


def _seed_catalog(app):
    with app.app_context():
        seed_roles()
        category = make_category("Electronics", "electronics")
        brand = make_brand("Northwind")
        product = make_product(
            "Admin Item", sku="SKU-ADMIN-1", slug="admin-item", price_cents=4000,
            stock=7, category=category, brand=brand,
        )
        db.session.commit()
        return product.id, category.id, brand.id


def test_admin_endpoints_require_a_permission(app, client):
    _seed_catalog(app)
    with app.app_context():
        make_user("customer@example.com")
        db.session.commit()
    customer_headers = auth_headers(token_for(app, "customer@example.com"))
    response = client.get(f"{ADMIN}/products", headers=customer_headers)
    assert response.status_code == 403
    assert response.get_json()["error"]["message"] == "You do not have permission to do this"


def test_admin_endpoints_require_a_token(app, client):
    _seed_catalog(app)
    assert client.get(f"{ADMIN}/products").status_code == 401


def test_inventory_manager_cannot_manage_products(app, client):
    _seed_catalog(app)
    with app.app_context():
        make_user("inventory@example.com", role="Inventory Manager", password=ADMIN_PASSWORD)
        db.session.commit()
    headers = _headers(app, "inventory@example.com")
    assert client.get(f"{ADMIN}/products", headers=headers).status_code == 403
    assert client.get(f"{ADMIN}/inventory", headers=headers).status_code == 200


def test_order_manager_can_manage_orders_but_not_products(app, client):
    _seed_catalog(app)
    with app.app_context():
        make_user("orders@example.com", role="Order Manager", password=ADMIN_PASSWORD)
        db.session.commit()
    headers = _headers(app, "orders@example.com")
    assert client.get(f"{ADMIN}/orders", headers=headers).status_code == 200
    assert client.get(f"{ADMIN}/products", headers=headers).status_code == 403


def test_product_table_lists_twenty_rows_per_page(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    body = client.get(f"{ADMIN}/products", headers=headers).get_json()
    assert body["meta"]["per_page"] == 20
    assert any(item["sku"] == "SKU-ADMIN-1" for item in body["data"])


def test_create_product_saves_it_as_draft(app, client):
    product_id, category_id, brand_id = _seed_catalog(app)
    headers = _admin(app)
    response = client.post(
        f"{ADMIN}/products",
        json={
            "name": "New Product",
            "sku": "SKU-NEW-1",
            "category_id": category_id,
            "brand_id": brand_id,
            "regular_price_cents": 2500,
            "description": "A new product",
        },
        headers=headers,
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["status"] == "draft"
    assert body["sku"] == "SKU-NEW-1"


def test_create_product_refuses_a_duplicate_sku(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    with app.app_context():
        category_id = db.session.execute(select(Category.id)).scalar_one()
    response = client.post(
        f"{ADMIN}/products",
        json={
            "name": "Duplicate",
            "sku": "SKU-ADMIN-1",
            "category_id": category_id,
            "regular_price_cents": 1000,
        },
        headers=headers,
    )
    assert response.status_code == 409
    error = response.get_json()["error"]
    assert error["code"] == "duplicate_sku"
    assert error["message"] == "This SKU is already in use"


def test_create_product_validates_the_required_fields(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    response = client.post(f"{ADMIN}/products", json={"name": "No SKU"}, headers=headers)
    assert response.status_code == 400
    fields = response.get_json()["error"]["fields"]
    assert "sku" in fields
    assert "category_id" in fields
    assert "regular_price_cents" in fields


def test_publish_and_archive_a_product(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    published = client.put(
        f"{ADMIN}/products/{product_id}", json={"status": "published"}, headers=headers
    )
    assert published.status_code == 200
    assert published.get_json()["status"] == "published"

    assert client.delete(f"{ADMIN}/products/{product_id}", headers=headers).status_code == 204
    with app.app_context():
        assert db.session.get(Product, product_id).status == "archived"


def test_bulk_action_applies_to_every_selected_product(app, client):
    product_id, category_id, _ = _seed_catalog(app)
    headers = _admin(app)
    with app.app_context():
        second = make_product("Second", sku="SKU-ADMIN-2", slug="second", category=db.session.get(Category, category_id))
        db.session.commit()
        second_id = second.id

    response = client.post(
        f"{ADMIN}/products/bulk",
        json={"ids": [product_id, second_id], "action": "publish"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()["updated"] == 2
    with app.app_context():
        assert db.session.get(Product, product_id).status == "published"
        assert db.session.get(Product, second_id).status == "published"


def test_image_upload_accepts_a_png(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    response = client.post(
        f"{ADMIN}/products/{product_id}/images",
        data={"file": (io.BytesIO(png), "photo.png")},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    assert response.get_json()["url"].startswith("/uploads/")


def test_image_upload_refuses_another_file_type(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    response = client.post(
        f"{ADMIN}/products/{product_id}/images",
        data={"file": (io.BytesIO(b"not an image"), "notes.txt")},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    error = response.get_json()["error"]
    assert error["code"] == "invalid_image"
    assert error["message"] == "Images must be JPEG or PNG and 5 MB or less"


def test_add_variant_tracks_its_own_stock(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    response = client.post(
        f"{ADMIN}/products/{product_id}/variants",
        json={"sku": "SKU-ADMIN-1-V1", "name": "Large", "price_cents": 4500, "stock": 4},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.get_json()["available_quantity"] == 4
    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.variant_id.is_not(None))
        ).scalar_one()
        assert inventory.quantity == 4


def test_category_tree_and_delete_refusal(app, client):
    product_id, category_id, _ = _seed_catalog(app)
    headers = _admin(app)
    tree = client.get(f"{ADMIN}/categories", headers=headers).get_json()["data"]
    node = next(item for item in tree if item["id"] == category_id)
    assert node["product_count"] == 1

    refused = client.delete(f"{ADMIN}/categories/{category_id}", headers=headers)
    assert refused.status_code == 409
    error = refused.get_json()["error"]
    assert error["code"] == "category_has_products"
    assert error["message"] == "Move or archive this category's products first"


def test_delete_an_empty_category(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    created = client.post(
        f"{ADMIN}/categories", json={"name": "Empty Category"}, headers=headers
    ).get_json()
    assert client.delete(f"{ADMIN}/categories/{created['id']}", headers=headers).status_code == 204


def test_create_and_edit_a_brand(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    created = client.post(
        f"{ADMIN}/brands", json={"name": "Lumen", "description": "Lighting"}, headers=headers
    )
    assert created.status_code == 201
    brand_id = created.get_json()["id"]
    updated = client.put(
        f"{ADMIN}/brands/{brand_id}", json={"description": "Lighting and comfort"}, headers=headers
    )
    assert updated.status_code == 200
    assert updated.get_json()["description"] == "Lighting and comfort"


def test_customer_directory_and_status_change(app, client):
    _seed_catalog(app)
    with app.app_context():
        customer = make_user("shopper@example.com")
        db.session.commit()
        customer_id = customer.id
    headers = _admin(app)

    body = client.get(f"{ADMIN}/customers", headers=headers).get_json()
    assert body["meta"]["per_page"] == 20
    assert any(row["email"] == "shopper@example.com" for row in body["data"])

    profile = client.get(f"{ADMIN}/customers/{customer_id}", headers=headers).get_json()
    assert profile["email"] == "shopper@example.com"
    assert "orders" in profile
    assert "spending" in profile

    deactivated = client.patch(
        f"{ADMIN}/customers/{customer_id}", json={"is_active": False}, headers=headers
    )
    assert deactivated.status_code == 200
    assert deactivated.get_json()["is_active"] is False

    with app.app_context():
        assert db.session.execute(
            select(AuditLog).where(AuditLog.action == "customer.status_changed")
        ).scalars().all()


def test_deactivated_customer_cannot_sign_in(app, client):
    _seed_catalog(app)
    with app.app_context():
        customer = make_user("shopper@example.com")
        db.session.commit()
        customer_id = customer.id
    headers = _admin(app)
    client.patch(f"{ADMIN}/customers/{customer_id}", json={"is_active": False}, headers=headers)

    response = client.post(
        "/api/v1/auth/login", json={"email": "shopper@example.com", "password": "Customer@12345"}
    )
    assert response.status_code == 403
    assert response.get_json()["error"]["message"] == "This account is inactive"


def _seed_order(app, status: str = "pending"):
    with app.app_context():
        customer = make_user("buyer@example.com")
        product = make_product("Ordered Item", sku="SKU-ORDER-1", slug="ordered-item", stock=5)
        order = Order(
            order_number="ORD-2026-9001",
            user_id=customer.id,
            status=status,
            payment_status="success" if status != "pending" else "pending",
            subtotal_cents=5000,
            shipping_cents=500,
            tax_cents=400,
            total_cents=5900,
            delivery_method="standard",
            placed_at=utcnow(),
        )
        db.session.add(order)
        db.session.flush()
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                quantity=1,
                unit_price_cents=5000,
                total_cents=5000,
            )
        )
        db.session.add(
            OrderStatusHistory(
                order_id=order.id, status=status, changed_by=customer.id, changed_at=utcnow()
            )
        )
        db.session.commit()
        return order.id


def test_order_table_filters_by_status(app, client):
    _seed_order(app, "pending")
    headers = _admin(app)
    body = client.get(f"{ADMIN}/orders", query_string={"status": "pending"}, headers=headers).get_json()
    assert body["meta"]["per_page"] == 20
    assert [order["order_number"] for order in body["data"]] == ["ORD-2026-9001"]

    empty = client.get(f"{ADMIN}/orders", query_string={"status": "delivered"}, headers=headers).get_json()
    assert empty["data"] == []


def test_order_status_change_writes_history_and_audit(app, client):
    order_id = _seed_order(app, "pending")
    headers = _admin(app)
    response = client.patch(
        f"{ADMIN}/orders/{order_id}/status", json={"status": "confirmed"}, headers=headers
    )
    assert response.status_code == 200
    assert response.get_json()["status"] == "confirmed"
    with app.app_context():
        history = db.session.execute(
            select(OrderStatusHistory).where(OrderStatusHistory.order_id == order_id)
        ).scalars().all()
        assert {entry.status for entry in history} == {"pending", "confirmed"}
        assert db.session.execute(
            select(AuditLog).where(AuditLog.action == "order.status_changed")
        ).scalars().all()


def test_invalid_status_change_is_refused(app, client):
    order_id = _seed_order(app, "pending")
    headers = _admin(app)
    response = client.patch(
        f"{ADMIN}/orders/{order_id}/status", json={"status": "delivered"}, headers=headers
    )
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "invalid_transition"
    assert error["message"] == "This status change is not allowed"


def test_invoice_and_csv_export(app, client):
    order_id = _seed_order(app, "confirmed")
    headers = _admin(app)
    invoice = client.get(f"{ADMIN}/orders/{order_id}/invoice", headers=headers)
    assert invoice.status_code == 200
    assert "ORD-2026-9001" in invoice.get_data(as_text=True)

    export = client.get(f"{ADMIN}/orders/export", headers=headers)
    assert export.status_code == 200
    assert export.mimetype == "text/csv"
    assert "ORD-2026-9001" in export.get_data(as_text=True)


def test_invoice_escapes_markup_from_the_database(app, client):
    order_id = _seed_order(app, "confirmed")
    headers = _admin(app)
    with app.app_context():
        item = db.session.execute(
            select(OrderItem).where(OrderItem.order_id == order_id)
        ).scalar_one()
        item.product_name = "<script>alert('xss')</script>"
        item.sku = "<img src=x onerror=alert(1)>"
        customer = db.session.execute(
            select(User).where(User.email == "buyer@example.com")
        ).scalar_one()
        customer.first_name = "<b>Bold</b>"
        customer.last_name = "<i>Italic</i>"
        db.session.commit()

    invoice = client.get(f"{ADMIN}/orders/{order_id}/invoice", headers=headers)
    assert invoice.status_code == 200
    assert invoice.mimetype == "text/html"
    body = invoice.get_data(as_text=True)
    assert "<script>" not in body
    assert "<img src=x" not in body
    assert "<b>Bold</b>" not in body
    assert escape("<script>alert('xss')</script>") in body
    assert escape("<img src=x onerror=alert(1)>") in body
    assert escape("<b>Bold</b>") in body


def test_refund_route_refuses_an_undelivered_order(app, client):
    order_id = _seed_order(app, "confirmed")
    headers = _admin(app)
    response = client.post(f"/api/v1/payments/orders/{order_id}/refund", headers=headers)
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "invalid_transition"
    assert error["message"] == "This status change is not allowed"
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.status == "confirmed"
        assert order.payment_status == "success"


def test_refund_route_refunds_a_delivered_order(app, client):
    order_id = _seed_order(app, "delivered")
    headers = _admin(app)
    response = client.post(f"/api/v1/payments/orders/{order_id}/refund", headers=headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "refunded"
    assert body["amount_cents"] == 5900
    with app.app_context():
        order = db.session.get(Order, order_id)
        assert order.status == "refunded"
        assert order.payment_status == "refunded"
        assert db.session.execute(
            select(AuditLog).where(AuditLog.action == "order.refunded")
        ).scalars().all()


def test_inventory_adjustment_records_a_movement(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    with app.app_context():
        inventory_id = db.session.execute(
            select(Inventory.id).where(Inventory.product_id == product_id)
        ).scalar_one()

    response = client.patch(
        f"{ADMIN}/inventory/{inventory_id}",
        json={"quantity": 20, "reason": "Stock count"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()["quantity"] == 20

    movements = client.get(f"{ADMIN}/inventory/{inventory_id}/movements", headers=headers).get_json()
    assert movements["data"][0]["reason"] == "Stock count"
    assert movements["data"][0]["quantity_change"] == 13


def test_inventory_refuses_a_negative_quantity(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    with app.app_context():
        inventory_id = db.session.execute(
            select(Inventory.id).where(Inventory.product_id == product_id)
        ).scalar_one()
    response = client.patch(
        f"{ADMIN}/inventory/{inventory_id}",
        json={"quantity": -1, "reason": "Mistake"},
        headers=headers,
    )
    assert response.status_code == 422
    error = response.get_json()["error"]
    assert error["code"] == "negative_stock"
    assert error["message"] == "Stock cannot go below zero"


def test_inventory_filters_low_and_out_of_stock(app, client):
    product_id, _, _ = _seed_catalog(app)
    headers = _admin(app)
    with app.app_context():
        inventory = db.session.execute(
            select(Inventory).where(Inventory.product_id == product_id)
        ).scalar_one()
        inventory.quantity = 0
        db.session.commit()

    out = client.get(f"{ADMIN}/inventory", query_string={"out_of_stock": "true"}, headers=headers).get_json()
    assert any(row["product_id"] == product_id for row in out["data"])


def test_coupon_is_created_inactive_and_refuses_a_duplicate(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    created = client.post(
        f"{ADMIN}/coupons",
        json={"code": "SPRING10", "type": "percentage", "value": 10},
        headers=headers,
    )
    assert created.status_code == 201
    assert created.get_json()["is_active"] is False

    duplicate = client.post(
        f"{ADMIN}/coupons",
        json={"code": "SPRING10", "type": "percentage", "value": 5},
        headers=headers,
    )
    assert duplicate.status_code == 409
    error = duplicate.get_json()["error"]
    assert error["code"] == "duplicate_code"
    assert error["message"] == "This coupon code already exists"


def test_coupon_detail_shows_redemptions(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    created = client.post(
        f"{ADMIN}/coupons",
        json={"code": "DETAIL10", "type": "fixed", "value": 500},
        headers=headers,
    ).get_json()
    detail = client.get(f"{ADMIN}/coupons/{created['id']}", headers=headers).get_json()
    assert detail["redemption_count"] == 0
    assert detail["orders"] == []


def test_review_moderation_updates_the_product_rating(app, client):
    product_id, _, _ = _seed_catalog(app)
    with app.app_context():
        user = make_user("reviewer@example.com")
        review = Review(
            product_id=product_id,
            user_id=user.id,
            rating=4,
            comment="A perfectly good review.",
            status="pending",
        )
        db.session.add(review)
        db.session.commit()
        review_id = review.id
    headers = _admin(app)

    queue = client.get(f"{ADMIN}/reviews", query_string={"status": "pending"}, headers=headers).get_json()
    assert any(row["id"] == review_id for row in queue["data"])

    approved = client.patch(
        f"{ADMIN}/reviews/{review_id}", json={"status": "approved"}, headers=headers
    )
    assert approved.status_code == 200
    assert approved.get_json()["status"] == "approved"
    with app.app_context():
        product = db.session.get(Product, product_id)
        assert product.rating_average == 4.0
        assert product.rating_count == 1


def test_admin_users_list_and_role_change(app, client):
    _seed_catalog(app)
    with app.app_context():
        make_user("manager@example.com", role="Admin", password=ADMIN_PASSWORD)
        db.session.commit()
        manager_id = db.session.execute(
            select(User.id).where(User.email == "manager@example.com")
        ).scalar_one()
        order_manager_role = db.session.execute(
            select(Role).where(Role.name == "Order Manager")
        ).scalar_one()
        order_manager_role_id = order_manager_role.id
    headers = _admin(app)

    users = client.get(f"{ADMIN}/users", headers=headers).get_json()["data"]
    assert any(row["email"] == "manager@example.com" for row in users)

    changed = client.patch(
        f"{ADMIN}/users/{manager_id}",
        json={"role_id": order_manager_role_id},
        headers=headers,
    )
    assert changed.status_code == 200
    assert changed.get_json()["role"] == "Order Manager"
    with app.app_context():
        assert db.session.execute(
            select(AuditLog).where(AuditLog.action == "user.updated")
        ).scalars().all()


def test_audit_log_lists_entries(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    with app.app_context():
        db.session.add(
            AuditLog(
                action="product.updated",
                entity_type="product",
                entity_id=1,
                details={"field": "name"},
            )
        )
        db.session.commit()

    body = client.get(f"{ADMIN}/audit-logs", headers=headers).get_json()
    assert body["meta"]["per_page"] == 20
    assert any(row["action"] == "product.updated" for row in body["data"])


def test_analytics_overview_has_every_kpi(app, client):
    _seed_order(app, "confirmed")
    headers = _admin(app)
    body = client.get(f"{ADMIN}/analytics/overview", headers=headers).get_json()
    for key in (
        "total_revenue_cents",
        "total_orders",
        "total_customers",
        "total_products",
        "average_order_value_cents",
        "pending_orders",
        "low_stock_products",
        "out_of_stock_products",
    ):
        assert key in body["kpis"]
    assert "revenue_trend" in body
    assert "previous_period" in body
    assert len(body["recent_orders"]) <= 5
    assert len(body["recent_customers"]) <= 5


def test_sales_grouping(app, client):
    _seed_order(app, "confirmed")
    headers = _admin(app)
    body = client.get(
        f"{ADMIN}/analytics/sales", query_string={"group_by": "month"}, headers=headers
    ).get_json()
    assert body["group_by"] == "month"
    assert body["series"]


def test_reports_and_csv_export(app, client):
    _seed_order(app, "confirmed")
    headers = _admin(app)
    report = client.get(f"{ADMIN}/reports/revenue", headers=headers).get_json()
    assert report["report"] == "revenue"
    assert "rows" in report

    export = client.get(f"{ADMIN}/reports/orders/export", headers=headers)
    assert export.status_code == 200
    assert export.mimetype == "text/csv"
    assert "ORD-2026-9001" in export.get_data(as_text=True)


def test_unknown_report_answers_404(app, client):
    _seed_catalog(app)
    headers = _admin(app)
    assert client.get(f"{ADMIN}/reports/unknown", headers=headers).status_code == 404
