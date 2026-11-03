"""Admin endpoints: products, categories, brands, customers, orders,
inventory, coupons, reviews, users and the audit log."""

from __future__ import annotations

from flask import Blueprint, Response, request

from ...middleware.auth import auth_required
from ...schemas import (
    AdminCouponSchema,
    AdminCustomerUpdateSchema,
    AdminInventoryUpdateSchema,
    AdminOrderStatusSchema,
    AdminProductSchema,
    AdminReviewUpdateSchema,
    AdminUserUpdateSchema,
    BrandSchema,
    BulkActionSchema,
    CategorySchema,
    VariantSchema,
    load_or_raise,
)
from ...services import admin_service
from ...utils.permissions import require_permission
from ...utils.responses import created, no_content, ok, paginated

bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")


def _params() -> dict:
    return dict(request.args)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


@bp.get("/products")
@auth_required
@require_permission("products.manage")
def list_products():  # noqa: ANN202
    items, meta = admin_service.list_products(_params())
    return paginated(items, meta)


@bp.post("/products")
@auth_required
@require_permission("products.manage")
def create_product():  # noqa: ANN202
    data = load_or_raise(AdminProductSchema(), request.get_json(silent=True))
    return created(admin_service.create_product(_actor(), data))


@bp.post("/products/bulk")
@auth_required
@require_permission("products.manage")
def bulk_action():  # noqa: ANN202
    data = load_or_raise(BulkActionSchema(), request.get_json(silent=True))
    return ok(admin_service.bulk_action(_actor(), data["ids"], data["action"]))


@bp.get("/products/<int:product_id>")
@auth_required
@require_permission("products.manage")
def get_product(product_id: int):  # noqa: ANN202
    return ok(admin_service.get_product(product_id))


@bp.put("/products/<int:product_id>")
@auth_required
@require_permission("products.manage")
def update_product(product_id: int):  # noqa: ANN202
    data = load_or_raise(AdminProductSchema(partial=True), request.get_json(silent=True))
    return ok(admin_service.update_product(_actor(), product_id, data))


@bp.delete("/products/<int:product_id>")
@auth_required
@require_permission("products.manage")
def delete_product(product_id: int):  # noqa: ANN202
    admin_service.archive_product(_actor(), product_id)
    return no_content()


@bp.post("/products/<int:product_id>/images")
@auth_required
@require_permission("products.manage")
def upload_image(product_id: int):  # noqa: ANN202
    return created(admin_service.add_image(_actor(), product_id, request.files.get("file")))


@bp.delete("/products/<int:product_id>/images/<int:image_id>")
@auth_required
@require_permission("products.manage")
def delete_image(product_id: int, image_id: int):  # noqa: ANN202
    admin_service.delete_image(_actor(), product_id, image_id)
    return no_content()


@bp.post("/products/<int:product_id>/variants")
@auth_required
@require_permission("products.manage")
def add_variant(product_id: int):  # noqa: ANN202
    data = load_or_raise(VariantSchema(), request.get_json(silent=True))
    return created(admin_service.add_variant(_actor(), product_id, data))


# ---------------------------------------------------------------------------
# Categories and brands
# ---------------------------------------------------------------------------


@bp.get("/categories")
@auth_required
@require_permission("categories.manage")
def list_categories():  # noqa: ANN202
    return ok({"data": admin_service.category_tree()})


@bp.post("/categories")
@auth_required
@require_permission("categories.manage")
def create_category():  # noqa: ANN202
    data = load_or_raise(CategorySchema(), request.get_json(silent=True))
    return created(admin_service.create_category(_actor(), data))


@bp.put("/categories/<int:category_id>")
@auth_required
@require_permission("categories.manage")
def update_category(category_id: int):  # noqa: ANN202
    data = load_or_raise(CategorySchema(partial=True), request.get_json(silent=True))
    return ok(admin_service.update_category(_actor(), category_id, data))


@bp.delete("/categories/<int:category_id>")
@auth_required
@require_permission("categories.manage")
def delete_category(category_id: int):  # noqa: ANN202
    admin_service.delete_category(_actor(), category_id)
    return no_content()


@bp.get("/brands")
@auth_required
@require_permission("categories.manage")
def list_brands():  # noqa: ANN202
    return ok({"data": admin_service.list_brands()})


@bp.post("/brands")
@auth_required
@require_permission("categories.manage")
def create_brand():  # noqa: ANN202
    data = load_or_raise(BrandSchema(), request.get_json(silent=True))
    return created(admin_service.create_brand(_actor(), data))


@bp.put("/brands/<int:brand_id>")
@auth_required
@require_permission("categories.manage")
def update_brand(brand_id: int):  # noqa: ANN202
    data = load_or_raise(BrandSchema(partial=True), request.get_json(silent=True))
    return ok(admin_service.update_brand(_actor(), brand_id, data))


@bp.delete("/brands/<int:brand_id>")
@auth_required
@require_permission("categories.manage")
def delete_brand(brand_id: int):  # noqa: ANN202
    admin_service.delete_brand(_actor(), brand_id)
    return no_content()


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------


@bp.get("/customers")
@auth_required
@require_permission("customers.manage")
def list_customers():  # noqa: ANN202
    items, meta = admin_service.list_customers(_params())
    return paginated(items, meta)


@bp.get("/customers/<int:customer_id>")
@auth_required
@require_permission("customers.manage")
def customer_profile(customer_id: int):  # noqa: ANN202
    return ok(admin_service.customer_profile(customer_id))


@bp.patch("/customers/<int:customer_id>")
@auth_required
@require_permission("customers.manage")
def update_customer(customer_id: int):  # noqa: ANN202
    data = load_or_raise(AdminCustomerUpdateSchema(), request.get_json(silent=True))
    return ok(admin_service.update_customer(_actor(), customer_id, data))


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


@bp.get("/orders")
@auth_required
@require_permission("orders.manage")
def list_orders():  # noqa: ANN202
    items, meta = admin_service.list_orders(_params())
    return paginated(items, meta)


@bp.get("/orders/export")
@auth_required
@require_permission("orders.manage")
def export_orders():  # noqa: ANN202
    csv_text = admin_service.export_orders_csv(_params())
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@bp.get("/orders/<int:order_id>")
@auth_required
@require_permission("orders.manage")
def get_order(order_id: int):  # noqa: ANN202
    return ok(admin_service.get_order(order_id))


@bp.patch("/orders/<int:order_id>/status")
@auth_required
@require_permission("orders.manage")
def change_order_status(order_id: int):  # noqa: ANN202
    data = load_or_raise(AdminOrderStatusSchema(), request.get_json(silent=True))
    return ok(admin_service.change_order_status(_actor(), order_id, data["status"]))


@bp.post("/orders/<int:order_id>/refund")
@auth_required
@require_permission("orders.manage")
def refund_order(order_id: int):  # noqa: ANN202
    return ok(admin_service.refund_order(_actor(), order_id))


@bp.get("/orders/<int:order_id>/invoice")
@auth_required
@require_permission("orders.manage")
def invoice(order_id: int):  # noqa: ANN202
    return Response(admin_service.invoice_html(order_id), mimetype="text/html")


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------


@bp.get("/inventory")
@auth_required
@require_permission("inventory.manage")
def list_inventory():  # noqa: ANN202
    items, meta = admin_service.list_inventory(_params())
    return paginated(items, meta)


@bp.patch("/inventory/<int:inventory_id>")
@auth_required
@require_permission("inventory.manage")
def adjust_inventory(inventory_id: int):  # noqa: ANN202
    data = load_or_raise(AdminInventoryUpdateSchema(), request.get_json(silent=True))
    return ok(admin_service.adjust_inventory(_actor(), inventory_id, data["quantity"], data["reason"]))


@bp.get("/inventory/<int:inventory_id>/movements")
@auth_required
@require_permission("inventory.manage")
def inventory_movements(inventory_id: int):  # noqa: ANN202
    return ok({"data": admin_service.inventory_movements(inventory_id)})


# ---------------------------------------------------------------------------
# Coupons
# ---------------------------------------------------------------------------


@bp.get("/coupons")
@auth_required
@require_permission("coupons.manage")
def list_coupons():  # noqa: ANN202
    return ok({"data": admin_service.list_coupons()})


@bp.post("/coupons")
@auth_required
@require_permission("coupons.manage")
def create_coupon():  # noqa: ANN202
    data = load_or_raise(AdminCouponSchema(), request.get_json(silent=True))
    return created(admin_service.create_coupon(_actor(), data))


@bp.get("/coupons/<int:coupon_id>")
@auth_required
@require_permission("coupons.manage")
def coupon_detail(coupon_id: int):  # noqa: ANN202
    return ok(admin_service.coupon_detail(coupon_id))


@bp.put("/coupons/<int:coupon_id>")
@auth_required
@require_permission("coupons.manage")
def update_coupon(coupon_id: int):  # noqa: ANN202
    data = load_or_raise(AdminCouponSchema(partial=True), request.get_json(silent=True))
    return ok(admin_service.update_coupon(_actor(), coupon_id, data))


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------


@bp.get("/reviews")
@auth_required
@require_permission("reviews.moderate")
def list_reviews():  # noqa: ANN202
    items, meta = admin_service.list_reviews(_params())
    return paginated(items, meta)


@bp.patch("/reviews/<int:review_id>")
@auth_required
@require_permission("reviews.moderate")
def moderate_review(review_id: int):  # noqa: ANN202
    data = load_or_raise(AdminReviewUpdateSchema(), request.get_json(silent=True))
    return ok(admin_service.moderate_review(_actor(), review_id, data["status"]))


# ---------------------------------------------------------------------------
# Admin users and audit log
# ---------------------------------------------------------------------------


@bp.get("/users")
@auth_required
@require_permission("users.manage")
def list_admin_users():  # noqa: ANN202
    return ok({"data": admin_service.list_admin_users()})


@bp.patch("/users/<int:user_id>")
@auth_required
@require_permission("users.manage")
def update_admin_user(user_id: int):  # noqa: ANN202
    data = load_or_raise(AdminUserUpdateSchema(), request.get_json(silent=True))
    return ok(admin_service.update_admin_user(_actor(), user_id, data))


@bp.get("/audit-logs")
@auth_required
@require_permission("audit.view")
def list_audit_logs():  # noqa: ANN202
    items, meta = admin_service.list_audit_logs(_params())
    return paginated(items, meta)


def _actor():  # noqa: ANN202
    from ...utils.permissions import require_user

    return require_user()


__all__ = ["bp"]
