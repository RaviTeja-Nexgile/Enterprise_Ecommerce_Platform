"""Turn model rows into the JSON shapes of the API contract."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from ..models import (
    Address,
    AuditLog,
    Brand,
    Category,
    Coupon,
    Inventory,
    InventoryMovement,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    User,
)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def user_dict(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "roles": user.role_names,
        "permissions": user.permission_names,
        "is_active": user.is_active,
    }


def address_dict(address: Address | None) -> dict[str, Any] | None:
    if address is None:
        return None
    return {
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


def brand_dict(brand: Brand) -> dict[str, Any]:
    return {
        "id": brand.id,
        "name": brand.name,
        "description": brand.description,
        "logo_url": brand.logo_url,
    }


def category_dict(category: Category, product_count: int | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "image_url": category.image_url,
        "parent_id": category.parent_id,
        "status": category.status,
        "sort_order": category.sort_order,
    }
    if product_count is not None:
        data["product_count"] = product_count
    return data


def image_dict(image: ProductImage) -> dict[str, Any]:
    return {
        "id": image.id,
        "url": image.url,
        "alt_text": image.alt_text,
        "sort_order": image.sort_order,
    }


def variant_dict(variant: ProductVariant, available: int | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": variant.id,
        "sku": variant.sku,
        "name": variant.name,
        "price_cents": variant.price_cents,
        "attributes": variant.attributes,
        "status": variant.status,
    }
    if available is not None:
        data["available_quantity"] = available
    return data


def product_summary(
    product: Product,
    *,
    available_quantity: int = 0,
    image_url: str | None = None,
) -> dict[str, Any]:
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "sku": product.sku,
        "short_description": product.short_description,
        "image_url": image_url if image_url is not None else (product.images[0].url if product.images else None),
        "brand": product.brand.name if product.brand else None,
        "category": product.category.name if product.category else None,
        "regular_price_cents": product.regular_price_cents,
        "discounted_price_cents": product.discounted_price_cents,
        "discount_percentage": product.discount_percentage,
        "in_stock": available_quantity > 0,
        "available_quantity": available_quantity,
        "rating_average": product.rating_average,
        "rating_count": product.rating_count,
        "is_featured": product.is_featured,
        "is_new_arrival": product.is_new_arrival,
    }


def product_detail(
    product: Product,
    *,
    available_quantity: int,
    variants: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    related: list[dict[str, Any]],
    rating_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = product_summary(product, available_quantity=available_quantity)
    data.update(
        {
            "description": product.description,
            "status": product.status,
            "images": [image_dict(image) for image in product.images],
            "variants": variants,
            "attributes": [
                {"name": attribute.name, "values": [value.value for value in attribute.values]}
                for attribute in getattr(product, "attributes", []) or []
            ],
            "reviews": reviews,
            "related": related,
        }
    )
    if rating_summary is not None:
        data["rating_summary"] = rating_summary
    return data


def review_dict(review: Review, author: str | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": review.id,
        "product_id": review.product_id,
        "user_id": review.user_id,
        "rating": review.rating,
        "comment": review.comment,
        "is_verified_purchase": review.is_verified_purchase,
        "status": review.status,
        "created_at": iso(review.created_at),
    }
    if author is not None:
        data["author"] = author
    return data


def order_item_dict(item: OrderItem) -> dict[str, Any]:
    return {
        "product_id": item.product_id,
        "variant_id": item.variant_id,
        "name": item.product_name,
        "sku": item.sku,
        "quantity": item.quantity,
        "unit_price_cents": item.unit_price_cents,
        "total_cents": item.total_cents,
    }


def payment_dict(payment: Payment | None) -> dict[str, Any] | None:
    if payment is None:
        return None
    return {
        "status": payment.status,
        "method": payment.method,
        "transaction_id": payment.transaction_id,
        "amount_cents": payment.amount_cents,
    }


def status_history_dict(entry: OrderStatusHistory, changed_by: str | None = None) -> dict[str, Any]:
    return {
        "status": entry.status,
        "changed_at": iso(entry.changed_at),
        "changed_by": changed_by,
        "note": entry.note,
    }


def order_dict(
    order: Order,
    *,
    payment: Payment | None = None,
    history: list[dict[str, Any]] | None = None,
    customer: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status,
        "subtotal_cents": order.subtotal_cents,
        "discount_cents": order.discount_cents,
        "shipping_cents": order.shipping_cents,
        "tax_cents": order.tax_cents,
        "total_cents": order.total_cents,
        "delivery_method": order.delivery_method,
        "placed_at": iso(order.placed_at),
        "items": [order_item_dict(item) for item in order.items],
        "shipping_address": address_dict(order.shipping_address),
        "billing_address": address_dict(order.billing_address),
        "payment": payment_dict(payment),
        "status_history": history or [],
    }
    if customer is not None:
        data["customer"] = customer
    return data


def coupon_dict(coupon: Coupon) -> dict[str, Any]:
    return {
        "id": coupon.id,
        "code": coupon.code,
        "type": coupon.type,
        "value": coupon.value,
        "min_order_value_cents": coupon.min_order_value_cents,
        "max_discount_cents": coupon.max_discount_cents,
        "expires_at": iso(coupon.expires_at),
        "usage_limit": coupon.usage_limit,
        "per_customer_limit": coupon.per_customer_limit,
        "is_active": coupon.is_active,
        "category_id": coupon.category_id,
    }


def inventory_dict(inventory: Inventory) -> dict[str, Any]:
    product = inventory.product
    variant = inventory.variant
    return {
        "id": inventory.id,
        "product_id": inventory.product_id,
        "variant_id": inventory.variant_id,
        "product_name": product.name if product else None,
        "sku": variant.sku if variant else (product.sku if product else None),
        "variant_name": variant.name if variant else None,
        "quantity": inventory.quantity,
        "reserved_quantity": inventory.reserved_quantity,
        "available_quantity": inventory.available_quantity,
        "low_stock_threshold": inventory.low_stock_threshold,
        "low_stock": inventory.available_quantity <= inventory.low_stock_threshold,
    }


def movement_dict(movement: InventoryMovement, person: str | None = None) -> dict[str, Any]:
    return {
        "id": movement.id,
        "inventory_id": movement.inventory_id,
        "quantity_change": movement.quantity_change,
        "reason": movement.reason,
        "created_by": person,
        "created_at": iso(movement.created_at),
    }


def audit_dict(entry: AuditLog, person: str | None = None) -> dict[str, Any]:
    return {
        "id": entry.id,
        "user_id": entry.user_id,
        "user": person,
        "action": entry.action,
        "entity_type": entry.entity_type,
        "entity_id": entry.entity_id,
        "details": entry.details,
        "created_at": iso(entry.created_at),
    }


__all__ = [
    "iso",
    "user_dict",
    "address_dict",
    "brand_dict",
    "category_dict",
    "image_dict",
    "variant_dict",
    "product_summary",
    "product_detail",
    "review_dict",
    "order_item_dict",
    "payment_dict",
    "status_history_dict",
    "order_dict",
    "coupon_dict",
    "inventory_dict",
    "movement_dict",
    "audit_dict",
]
