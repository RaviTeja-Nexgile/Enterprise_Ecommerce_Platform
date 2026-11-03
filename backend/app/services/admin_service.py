"""Admin operations: products, categories, brands, customers, orders,
inventory, coupons, reviews, admin users and the audit log."""

from __future__ import annotations

import csv
import io
import re
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Any

from flask import current_app
from werkzeug.utils import secure_filename

from ..errors import BusinessRuleError, ConflictError, NotFoundError, ValidationError
from ..extensions import db
from ..models import (
    Brand,
    Category,
    Coupon,
    Inventory,
    InventoryMovement,
    Order,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    User,
    utcnow,
)
from ..repositories import admin_repo, catalog_repo, order_repo
from ..utils.audit import write_audit_log
from ..utils.pagination import pagination_meta
from . import order_service
from .serializers import (
    audit_dict,
    brand_dict,
    category_dict,
    coupon_dict,
    image_dict,
    inventory_dict,
    movement_dict,
    order_dict,
    product_summary,
    review_dict,
    user_dict,
    variant_dict,
)

DUPLICATE_SKU_MESSAGE = "This SKU is already in use"
INVALID_IMAGE_MESSAGE = "Images must be JPEG or PNG and 5 MB or less"
CATEGORY_HAS_PRODUCTS_MESSAGE = "Move or archive this category's products first"
DUPLICATE_COUPON_MESSAGE = "This coupon code already exists"
NEGATIVE_STOCK_MESSAGE = "Stock cannot go below zero"


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def _unique_slug(model, base: str, exclude_id: int | None = None) -> str:
    slug = base
    counter = 2
    while True:
        existing = db.session.query(model).filter_by(slug=slug).first()
        if existing is None or existing.id == exclude_id:
            return slug
        slug = f"{base}-{counter}"
        counter += 1


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


def _admin_product(product: Product) -> dict[str, Any]:
    available = catalog_repo.available_quantity(product.id, None)
    data = product_summary(product, available_quantity=available)
    data.update(
        {
            "description": product.description,
            "status": product.status,
            "category_id": product.category_id,
            "brand_id": product.brand_id,
            "images": [image_dict(image) for image in product.images],
            "variants": [
                variant_dict(
                    variant, available=catalog_repo.available_quantity(product.id, variant.id)
                )
                for variant in product.variants
            ],
        }
    )
    return data


def list_products(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 20), 1), 100)
    query = admin_repo.admin_product_query(
        q=params.get("q"),
        status=params.get("status"),
        category=params.get("category"),
        brand=params.get("brand"),
    )
    total = admin_repo.count_products(query)
    products = admin_repo.page_products(query, page, per_page)
    return [_admin_product(product) for product in products], pagination_meta(page, per_page, total)


def get_product(product_id: int) -> dict[str, Any]:
    product = admin_repo.product_by_id(product_id)
    if product is None:
        raise NotFoundError("The requested product was not found")
    return _admin_product(product)


def _apply_product_fields(product: Product, data: dict[str, Any]) -> None:
    for field in (
        "name",
        "sku",
        "category_id",
        "brand_id",
        "regular_price_cents",
        "discounted_price_cents",
        "discount_percentage",
        "description",
        "short_description",
        "status",
        "is_featured",
        "is_new_arrival",
    ):
        if field in data and data[field] is not None:
            setattr(product, field, data[field])


def create_product(actor: User, data: dict[str, Any]) -> dict[str, Any]:
    """Create a product with status draft (requirement 12.2, 12.3)."""
    if admin_repo.sku_in_use(data["sku"]):
        raise ConflictError(DUPLICATE_SKU_MESSAGE, code="duplicate_sku")
    if admin_repo.category_by_id(data["category_id"]) is None:
        raise ValidationError(
            "The category was not found", fields={"category_id": "Choose a category"}
        )
    product = Product(
        name=data["name"],
        sku=data["sku"],
        slug=_unique_slug(Product, _slugify(data["name"])),
        status="draft",
    )
    _apply_product_fields(product, data)
    admin_repo.add_product(product)
    db.session.flush()
    db.session.add(
        Inventory(product_id=product.id, variant_id=None, quantity=0, reserved_quantity=0)
    )
    write_audit_log(
        "product.created", "product", product.id, user_id=actor.id, details={"sku": product.sku}
    )
    db.session.commit()
    return _admin_product(product)


def update_product(actor: User, product_id: int, data: dict[str, Any]) -> dict[str, Any]:
    product = admin_repo.product_by_id(product_id)
    if product is None:
        raise NotFoundError("The requested product was not found")
    if data.get("sku") and admin_repo.sku_in_use(data["sku"], exclude_product_id=product.id):
        raise ConflictError(DUPLICATE_SKU_MESSAGE, code="duplicate_sku")
    _apply_product_fields(product, data)
    write_audit_log(
        "product.updated", "product", product.id, user_id=actor.id, details={"fields": sorted(data)}
    )
    db.session.commit()
    return _admin_product(product)


def archive_product(actor: User, product_id: int) -> None:
    """Archive a product, keeping its order history (requirement 12.10)."""
    product = admin_repo.product_by_id(product_id)
    if product is None:
        raise NotFoundError("The requested product was not found")
    product.status = "archived"
    write_audit_log("product.archived", "product", product.id, user_id=actor.id)
    db.session.commit()


def bulk_action(actor: User, ids: list[int], action: str) -> dict[str, Any]:
    """Publish, unpublish or archive every selected product (requirement 12.9)."""
    status = {"publish": "published", "unpublish": "draft", "archive": "archived"}[action]
    updated = 0
    for product_id in ids:
        product = admin_repo.product_by_id(product_id)
        if product is None:
            continue
        product.status = status
        updated += 1
    write_audit_log(
        f"product.bulk_{action}", "product", None, user_id=actor.id, details={"ids": ids}
    )
    db.session.commit()
    return {"updated": updated, "status": status}


def add_image(actor: User, product_id: int, file) -> dict[str, Any]:  # noqa: ANN001
    """Attach a JPEG or PNG of 5 MB or less (requirement 12.5, 12.6)."""
    product = admin_repo.product_by_id(product_id)
    if product is None:
        raise NotFoundError("The requested product was not found")
    if file is None or not file.filename:
        raise ValidationError(INVALID_IMAGE_MESSAGE, code="invalid_image")

    filename = secure_filename(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png"}:
        raise ValidationError(INVALID_IMAGE_MESSAGE, code="invalid_image")
    content = file.read()
    if len(content) > int(current_app.config.get("MAX_UPLOAD_BYTES", 5 * 1024 * 1024)):
        raise ValidationError(INVALID_IMAGE_MESSAGE, code="invalid_image")
    if not _looks_like_image(content, extension):
        raise ValidationError(INVALID_IMAGE_MESSAGE, code="invalid_image")

    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"product-{product.id}-{utcnow().strftime('%Y%m%d%H%M%S%f')}{extension}"
    (upload_folder / stored_name).write_bytes(content)

    image = ProductImage(
        product_id=product.id,
        url=f"/uploads/{stored_name}",
        alt_text=product.name,
        sort_order=len(product.images),
    )
    admin_repo.add_image(image)
    write_audit_log("product.image_added", "product", product.id, user_id=actor.id)
    db.session.commit()
    return image_dict(image)


def _looks_like_image(content: bytes, extension: str) -> bool:
    if extension == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    return content.startswith(b"\xff\xd8\xff")


def delete_image(actor: User, product_id: int, image_id: int) -> None:
    image = catalog_repo.image_by_id(image_id)
    if image is None or image.product_id != product_id:
        raise NotFoundError("The requested image was not found")
    db.session.delete(image)
    write_audit_log("product.image_removed", "product", product_id, user_id=actor.id)
    db.session.commit()


def add_variant(actor: User, product_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """Add a variant with its own SKU, price and stock (requirement 12.7)."""
    product = admin_repo.product_by_id(product_id)
    if product is None:
        raise NotFoundError("The requested product was not found")
    if admin_repo.sku_in_use(data["sku"]):
        raise ConflictError(DUPLICATE_SKU_MESSAGE, code="duplicate_sku")
    variant = ProductVariant(
        product_id=product.id,
        sku=data["sku"],
        name=data["name"],
        price_cents=data["price_cents"],
        attributes=data.get("attributes"),
        status=data.get("status") or "published",
    )
    admin_repo.add_variant(variant)
    db.session.flush()
    stock = int(data.get("stock") or 0)
    inventory = Inventory(
        product_id=product.id,
        variant_id=variant.id,
        quantity=stock,
        reserved_quantity=0,
        low_stock_threshold=3,
    )
    db.session.add(inventory)
    db.session.flush()
    if stock:
        db.session.add(
            InventoryMovement(
                inventory_id=inventory.id,
                quantity_change=stock,
                reason="Initial stock",
                created_by=actor.id,
            )
        )
    write_audit_log("product.variant_added", "product", product.id, user_id=actor.id)
    db.session.commit()
    return variant_dict(variant, available=stock)


# ---------------------------------------------------------------------------
# Categories and brands
# ---------------------------------------------------------------------------


def category_tree() -> list[dict[str, Any]]:
    categories = admin_repo.all_categories()
    by_parent: dict[int | None, list[Category]] = {}
    for category in categories:
        by_parent.setdefault(category.parent_id, []).append(category)

    def build(parent_id: int | None) -> list[dict[str, Any]]:
        nodes = []
        for category in by_parent.get(parent_id, []):
            node = category_dict(
                category, product_count=admin_repo.products_in_category(category.id)
            )
            node["children"] = build(category.id)
            nodes.append(node)
        return nodes

    return build(None)


def create_category(actor: User, data: dict[str, Any]) -> dict[str, Any]:
    category = Category(
        name=data["name"],
        slug=_unique_slug(Category, _slugify(data["name"])),
        description=data.get("description"),
        parent_id=data.get("parent_id"),
        status=data.get("status") or "active",
        sort_order=data.get("sort_order") or 0,
        image_url=data.get("image_url"),
    )
    admin_repo.add_category(category)
    db.session.flush()
    write_audit_log("category.created", "category", category.id, user_id=actor.id)
    db.session.commit()
    return category_dict(category, product_count=0)


def update_category(actor: User, category_id: int, data: dict[str, Any]) -> dict[str, Any]:
    category = admin_repo.category_by_id(category_id)
    if category is None:
        raise NotFoundError("The requested category was not found")
    for field in ("name", "description", "parent_id", "status", "sort_order", "image_url"):
        if field in data:
            setattr(category, field, data[field])
    write_audit_log("category.updated", "category", category.id, user_id=actor.id)
    db.session.commit()
    return category_dict(category, product_count=admin_repo.products_in_category(category.id))


def delete_category(actor: User, category_id: int) -> None:
    """Refuse to delete a category that holds products (requirement 13.4)."""
    category = admin_repo.category_by_id(category_id)
    if category is None:
        raise NotFoundError("The requested category was not found")
    if admin_repo.products_in_category(category.id) > 0:
        raise ConflictError(CATEGORY_HAS_PRODUCTS_MESSAGE, code="category_has_products")
    category.deleted_at = utcnow()
    write_audit_log("category.deleted", "category", category.id, user_id=actor.id)
    db.session.commit()


def list_brands() -> list[dict[str, Any]]:
    return [brand_dict(brand) for brand in admin_repo.all_brands()]


def create_brand(actor: User, data: dict[str, Any]) -> dict[str, Any]:
    if db.session.query(Brand).filter_by(name=data["name"]).first() is not None:
        raise ConflictError("This brand already exists", code="duplicate_brand")
    brand = Brand(
        name=data["name"],
        description=data.get("description"),
        logo_url=data.get("logo_url"),
    )
    admin_repo.add_brand(brand)
    db.session.flush()
    write_audit_log("brand.created", "brand", brand.id, user_id=actor.id)
    db.session.commit()
    return brand_dict(brand)


def update_brand(actor: User, brand_id: int, data: dict[str, Any]) -> dict[str, Any]:
    brand = admin_repo.brand_by_id(brand_id)
    if brand is None:
        raise NotFoundError("The requested brand was not found")
    for field in ("name", "description", "logo_url"):
        if field in data:
            setattr(brand, field, data[field])
    write_audit_log("brand.updated", "brand", brand.id, user_id=actor.id)
    db.session.commit()
    return brand_dict(brand)


def delete_brand(actor: User, brand_id: int) -> None:
    brand = admin_repo.brand_by_id(brand_id)
    if brand is None:
        raise NotFoundError("The requested brand was not found")
    brand.deleted_at = utcnow()
    write_audit_log("brand.deleted", "brand", brand.id, user_id=actor.id)
    db.session.commit()


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------


def _customer_row(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "registered_at": user.created_at.isoformat() if user.created_at else None,
        "is_active": user.is_active,
        "total_spent_cents": admin_repo.total_spent(user.id),
    }


def list_customers(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 20), 1), 100)
    query = admin_repo.customer_query(params.get("q"))
    total = admin_repo.count_users(query)
    users = admin_repo.page_users(query, page, per_page)
    return [_customer_row(user) for user in users], pagination_meta(page, per_page, total)


def customer_profile(customer_id: int) -> dict[str, Any]:
    user = admin_repo.user_by_id(customer_id)
    if user is None:
        raise NotFoundError("The requested customer was not found")
    orders = admin_repo.orders_for_user(user.id)
    return {
        **_customer_row(user),
        "addresses": [
            {
                "id": address.id,
                "type": address.type,
                "line1": address.line1,
                "line2": address.line2,
                "city": address.city,
                "state": address.state,
                "postal_code": address.postal_code,
                "country": address.country,
                "is_default": address.is_default,
            }
            for address in user_repo_addresses(user.id)
        ],
        "orders": [
            {
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status,
                "total_cents": order.total_cents,
                "placed_at": order.placed_at.isoformat() if order.placed_at else None,
            }
            for order in orders
        ],
        "order_count": len(orders),
        "spending": {"total_cents": admin_repo.total_spent(user.id)},
    }


def user_repo_addresses(user_id: int):  # noqa: ANN201
    from ..repositories import user_repo

    return user_repo.addresses_for(user_id)


def update_customer(actor: User, customer_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """Activate or deactivate a customer (requirement 14.3, 14.4)."""
    user = admin_repo.user_by_id(customer_id)
    if user is None:
        raise NotFoundError("The requested customer was not found")
    user.is_active = bool(data["is_active"])
    write_audit_log(
        "customer.status_changed",
        "user",
        user.id,
        user_id=actor.id,
        details={"is_active": user.is_active},
    )
    db.session.commit()
    return _customer_row(user)


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except ValueError:
        return None


def _admin_order(order: Order) -> dict[str, Any]:
    customer = order_repo.user_by_id(order.user_id)
    return order_service.order_payload(
        order,
        customer=(
            {"id": customer.id, "name": customer.full_name, "email": customer.email}
            if customer
            else None
        ),
    )


def list_orders(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 20), 1), 100)
    query = admin_repo.admin_order_query(
        q=params.get("q"),
        status=params.get("status"),
        from_date=_parse_date(params.get("from")),
        to_date=_parse_date(params.get("to")),
    )
    total = admin_repo.count_orders(query)
    orders = admin_repo.page_orders(query, page, per_page)
    return [_admin_order(order) for order in orders], pagination_meta(page, per_page, total)


def get_order(order_id: int) -> dict[str, Any]:
    order = admin_repo.order_by_id(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    return _admin_order(order)


def change_order_status(actor: User, order_id: int, status: str) -> dict[str, Any]:
    order = admin_repo.order_by_id(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    order_service.change_status(order, status, actor)
    return _admin_order(order)


def refund_order(actor: User, order_id: int) -> dict[str, Any]:
    order = admin_repo.order_by_id(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    order_service.refund_order(order, actor)
    return _admin_order(order)


def invoice_html(order_id: int) -> str:
    """A printable invoice (requirement 15.7).

    Every value that comes from the database is HTML-escaped: a product name,
    SKU, order number or customer name may hold markup an admin saved, and the
    page is served as ``text/html`` on the API origin.
    """
    order = admin_repo.order_by_id(order_id)
    if order is None:
        raise NotFoundError("The requested order was not found")
    customer = order_repo.user_by_id(order.user_id)
    rows = "".join(
        f"<tr><td>{escape(item.product_name)}</td><td>{escape(item.sku)}</td>"
        f"<td>{escape(str(item.quantity))}</td>"
        f"<td>${item.unit_price_cents / 100:.2f}</td><td>${item.total_cents / 100:.2f}</td></tr>"
        for item in order.items
    )
    placed = order.placed_at.strftime("%Y-%m-%d") if order.placed_at else ""
    order_number = escape(order.order_number)
    customer_name = escape(customer.full_name) if customer else ""
    customer_email = escape(customer.email) if customer else ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Invoice {order_number}</title>
<style>body{{font-family:system-ui,sans-serif;margin:32px;color:#111827}}
table{{width:100%;border-collapse:collapse}}th,td{{text-align:left;padding:8px;border-bottom:1px solid #D1D5DB}}
.total{{font-weight:600}}</style></head>
<body>
<h1>Invoice {order_number}</h1>
<p>Customer: {customer_name} ({customer_email})</p>
<p>Date: {escape(placed)}</p>
<table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
<tbody>{rows}</tbody></table>
<p>Subtotal: ${order.subtotal_cents / 100:.2f}</p>
<p>Discount: ${order.discount_cents / 100:.2f}</p>
<p>Shipping: ${order.shipping_cents / 100:.2f}</p>
<p>Tax: ${order.tax_cents / 100:.2f}</p>
<p class="total">Total: ${order.total_cents / 100:.2f}</p>
</body></html>"""


def export_orders_csv(params: dict[str, Any]) -> str:
    """CSV of the orders matching the current filters (requirement 15.8)."""
    query = admin_repo.admin_order_query(
        q=params.get("q"),
        status=params.get("status"),
        from_date=_parse_date(params.get("from")),
        to_date=_parse_date(params.get("to")),
    )
    orders = admin_repo.page_orders(query, 1, 10000)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Order number", "Date", "Customer", "Status", "Payment status", "Total (USD)"])
    for order in orders:
        customer = order_repo.user_by_id(order.user_id)
        writer.writerow(
            [
                order.order_number,
                order.placed_at.strftime("%Y-%m-%d") if order.placed_at else "",
                customer.email if customer else "",
                order.status,
                order.payment_status,
                f"{order.total_cents / 100:.2f}",
            ]
        )
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------


def list_inventory(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 20), 1), 100)
    query = admin_repo.inventory_query(
        low_stock=str(params.get("low_stock", "")).lower() in {"1", "true", "yes"},
        out_of_stock=str(params.get("out_of_stock", "")).lower() in {"1", "true", "yes"},
        q=params.get("q"),
    )
    total = admin_repo.count_inventory(query)
    rows = admin_repo.page_inventory(query, page, per_page)
    return [inventory_dict(row) for row in rows], pagination_meta(page, per_page, total)


def adjust_inventory(actor: User, inventory_id: int, quantity: int, reason: str) -> dict[str, Any]:
    """Set a stock quantity and record the movement (requirement 16.2, 16.3)."""
    inventory = admin_repo.inventory_by_id(inventory_id)
    if inventory is None:
        raise NotFoundError("The requested inventory record was not found")
    if quantity < 0:
        raise BusinessRuleError(NEGATIVE_STOCK_MESSAGE, code="negative_stock")
    change = quantity - inventory.quantity
    inventory.quantity = quantity
    admin_repo.add_movement(
        InventoryMovement(
            inventory_id=inventory.id,
            quantity_change=change,
            reason=reason,
            created_by=actor.id,
        )
    )
    write_audit_log(
        "inventory.adjusted",
        "inventory",
        inventory.id,
        user_id=actor.id,
        details={"change": change, "reason": reason},
    )
    db.session.commit()
    return inventory_dict(inventory)


def inventory_movements(inventory_id: int) -> list[dict[str, Any]]:
    inventory = admin_repo.inventory_by_id(inventory_id)
    if inventory is None:
        raise NotFoundError("The requested inventory record was not found")
    result = []
    for movement in admin_repo.movements_for(inventory_id):
        person = None
        if movement.created_by:
            user = admin_repo.user_by_id(movement.created_by)
            person = user.full_name if user else None
        result.append(movement_dict(movement, person=person))
    return result


# ---------------------------------------------------------------------------
# Coupons
# ---------------------------------------------------------------------------


def list_coupons() -> list[dict[str, Any]]:
    return [coupon_dict(coupon) for coupon in admin_repo.all_coupons()]


def create_coupon(actor: User, data: dict[str, Any]) -> dict[str, Any]:
    """Save a coupon as inactive (requirement 17.1, 17.6)."""
    code = data["code"].strip().upper()
    if admin_repo.coupon_by_code(code) is not None:
        raise ConflictError(DUPLICATE_COUPON_MESSAGE, code="duplicate_code")
    coupon = Coupon(
        code=code,
        type=data["type"],
        value=data["value"],
        min_order_value_cents=data.get("min_order_value_cents") or 0,
        max_discount_cents=data.get("max_discount_cents"),
        expires_at=data.get("expires_at"),
        usage_limit=data.get("usage_limit"),
        per_customer_limit=data.get("per_customer_limit"),
        is_active=False,
        category_id=data.get("category_id"),
    )
    admin_repo.add_coupon(coupon)
    db.session.flush()
    write_audit_log("coupon.created", "coupon", coupon.id, user_id=actor.id)
    db.session.commit()
    return coupon_dict(coupon)


def update_coupon(actor: User, coupon_id: int, data: dict[str, Any]) -> dict[str, Any]:
    coupon = admin_repo.coupon_by_id(coupon_id)
    if coupon is None:
        raise NotFoundError("The requested coupon was not found")
    if data.get("code"):
        code = data["code"].strip().upper()
        existing = admin_repo.coupon_by_code(code)
        if existing is not None and existing.id != coupon.id:
            raise ConflictError(DUPLICATE_COUPON_MESSAGE, code="duplicate_code")
        coupon.code = code
    for field in (
        "type",
        "value",
        "min_order_value_cents",
        "max_discount_cents",
        "expires_at",
        "usage_limit",
        "per_customer_limit",
        "is_active",
        "category_id",
    ):
        if field in data:
            setattr(coupon, field, data[field])
    write_audit_log("coupon.updated", "coupon", coupon.id, user_id=actor.id)
    db.session.commit()
    return coupon_dict(coupon)


def coupon_detail(coupon_id: int) -> dict[str, Any]:
    """A coupon with its redemption count and orders (requirement 17.5)."""
    coupon = admin_repo.coupon_by_id(coupon_id)
    if coupon is None:
        raise NotFoundError("The requested coupon was not found")
    redemptions = admin_repo.redemptions_for(coupon.id)
    data = coupon_dict(coupon)
    data["redemption_count"] = len(redemptions)
    data["orders"] = [
        {
            "order_id": redemption.order_id,
            "user_id": redemption.user_id,
            "redeemed_at": redemption.redeemed_at.isoformat(),
        }
        for redemption in redemptions
    ]
    return data


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------


def list_reviews(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 20), 1), 100)
    query = admin_repo.review_query(params.get("status"))
    total = admin_repo.count_reviews(query)
    reviews = admin_repo.page_reviews(query, page, per_page)
    rows = []
    for review in reviews:
        user = admin_repo.user_by_id(review.user_id)
        product = admin_repo.product_by_id(review.product_id)
        row = review_dict(review, author=user.full_name if user else None)
        row["product_name"] = product.name if product else None
        rows.append(row)
    return rows, pagination_meta(page, per_page, total)


def moderate_review(actor: User, review_id: int, status: str) -> dict[str, Any]:
    """Approve or reject a review and refresh the product rating (requirement 19)."""
    review = admin_repo.review_by_id(review_id)
    if review is None:
        raise NotFoundError("The requested review was not found")
    review.status = status
    product = admin_repo.product_by_id(review.product_id)
    if product is not None:
        average, count = admin_repo.approved_rating_stats(product.id)
        product.rating_average = average
        product.rating_count = count
    write_audit_log(
        "review.moderated", "review", review.id, user_id=actor.id, details={"status": status}
    )
    db.session.commit()
    return review_dict(review)


# ---------------------------------------------------------------------------
# Admin users and audit log
# ---------------------------------------------------------------------------


def list_admin_users() -> list[dict[str, Any]]:
    rows = []
    for user in admin_repo.admin_users():
        data = user_dict(user)
        data["role"] = user.role_names[0] if user.role_names else None
        rows.append(data)
    return rows


def update_admin_user(actor: User, user_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """Change an admin account's role or status (requirement 2.10)."""
    user = admin_repo.user_by_id(user_id)
    if user is None:
        raise NotFoundError("The requested user was not found")
    if data.get("role_id") is not None:
        role = admin_repo.role_by_id(data["role_id"])
        if role is None:
            raise ValidationError("The role was not found", fields={"role_id": "Choose a role"})
        user.roles = [role]
    if data.get("is_active") is not None:
        user.is_active = bool(data["is_active"])
    write_audit_log(
        "user.updated",
        "user",
        user.id,
        user_id=actor.id,
        details={"role_id": data.get("role_id"), "is_active": data.get("is_active")},
    )
    db.session.commit()
    result = user_dict(user)
    result["role"] = user.role_names[0] if user.role_names else None
    return result


def list_audit_logs(params: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    page = max(int(params.get("page") or 1), 1)
    per_page = min(max(int(params.get("per_page") or 20), 1), 100)
    user_id = params.get("user_id")
    query = admin_repo.audit_query(
        user_id=int(user_id) if user_id and str(user_id).isdigit() else None,
        entity_type=params.get("entity_type"),
        from_date=_parse_date(params.get("from")),
        to_date=_parse_date(params.get("to")),
    )
    total = admin_repo.count_audit(query)
    entries = admin_repo.page_audit(query, page, per_page)
    rows = []
    for entry in entries:
        person = None
        if entry.user_id:
            user = admin_repo.user_by_id(entry.user_id)
            person = user.full_name if user else None
        rows.append(audit_dict(entry, person=person))
    return rows, pagination_meta(page, per_page, total)


__all__ = [
    "list_products",
    "get_product",
    "create_product",
    "update_product",
    "archive_product",
    "bulk_action",
    "add_image",
    "delete_image",
    "add_variant",
    "category_tree",
    "create_category",
    "update_category",
    "delete_category",
    "list_brands",
    "create_brand",
    "update_brand",
    "delete_brand",
    "list_customers",
    "customer_profile",
    "update_customer",
    "list_orders",
    "get_order",
    "change_order_status",
    "refund_order",
    "invoice_html",
    "export_orders_csv",
    "list_inventory",
    "adjust_inventory",
    "inventory_movements",
    "list_coupons",
    "create_coupon",
    "update_coupon",
    "coupon_detail",
    "list_reviews",
    "moderate_review",
    "list_admin_users",
    "update_admin_user",
    "list_audit_logs",
    "DUPLICATE_SKU_MESSAGE",
    "INVALID_IMAGE_MESSAGE",
    "CATEGORY_HAS_PRODUCTS_MESSAGE",
    "DUPLICATE_COUPON_MESSAGE",
    "NEGATIVE_STOCK_MESSAGE",
]
