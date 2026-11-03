"""Admin queries: products, categories, brands, customers, orders, inventory,
coupons, reviews, users, audit logs and analytics."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Select, func, or_, select

from ..extensions import db
from ..models import (
    AuditLog,
    Brand,
    Category,
    Coupon,
    CouponRedemption,
    Inventory,
    InventoryMovement,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    Role,
    User,
)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


def admin_product_query(
    *,
    q: str | None = None,
    status: str | None = None,
    category: str | None = None,
    brand: str | None = None,
) -> Select:
    query = select(Product)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if status:
        query = query.where(Product.status == status)
    if category:
        query = query.where(Product.category_id == int(category)) if str(category).isdigit() else query
    if brand:
        query = query.where(Product.brand_id == int(brand)) if str(brand).isdigit() else query
    return query.order_by(Product.id.desc())


def count_products(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(Product.id)).order_by(None)
        ).scalar()
        or 0
    )


def page_products(query: Select, page: int, per_page: int) -> list[Product]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


def product_by_id(product_id: int) -> Product | None:
    return db.session.get(Product, product_id)


def sku_in_use(sku: str, exclude_product_id: int | None = None) -> bool:
    product = db.session.execute(
        select(Product.id).where(Product.sku == sku)
    ).scalars().first()
    if product is not None and product != exclude_product_id:
        return True
    variant = db.session.execute(
        select(ProductVariant.id).where(ProductVariant.sku == sku)
    ).scalars().first()
    return variant is not None


def add_product(product: Product) -> Product:
    db.session.add(product)
    return product


def add_image(image: ProductImage) -> ProductImage:
    db.session.add(image)
    return image


def add_variant(variant: ProductVariant) -> ProductVariant:
    db.session.add(variant)
    return variant


def category_by_id(category_id: int) -> Category | None:
    return db.session.get(Category, category_id)


def brand_by_id(brand_id: int) -> Brand | None:
    return db.session.get(Brand, brand_id)


# ---------------------------------------------------------------------------
# Categories and brands
# ---------------------------------------------------------------------------


def all_categories() -> list[Category]:
    return list(
        db.session.execute(
            select(Category)
            .where(Category.deleted_at.is_(None))
            .order_by(Category.sort_order, Category.name)
        ).scalars().all()
    )


def add_category(category: Category) -> Category:
    db.session.add(category)
    return category


def all_brands() -> list[Brand]:
    return list(
        db.session.execute(
            select(Brand).where(Brand.deleted_at.is_(None)).order_by(Brand.name)
        ).scalars().all()
    )


def add_brand(brand: Brand) -> Brand:
    db.session.add(brand)
    return brand


def products_in_category(category_id: int) -> int:
    return int(
        db.session.execute(
            select(func.count(Product.id)).where(
                Product.category_id == category_id, Product.deleted_at.is_(None)
            )
        ).scalar()
        or 0
    )


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------


def customer_query(q: str | None = None) -> Select:
    query = (
        select(User)
        .join(User.roles)
        .where(Role.name == "Customer", User.deleted_at.is_(None))
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )
    return query.order_by(User.created_at.desc())


def count_users(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(User.id)).order_by(None)
        ).scalar()
        or 0
    )


def page_users(query: Select, page: int, per_page: int) -> list[User]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


def user_by_id(user_id: int) -> User | None:
    return db.session.get(User, user_id)


def total_spent(user_id: int) -> int:
    return int(
        db.session.execute(
            select(func.coalesce(func.sum(Order.total_cents), 0)).where(
                Order.user_id == user_id,
                Order.status.notin_(["cancelled", "refunded"]),
            )
        ).scalar()
        or 0
    )


def orders_for_user(user_id: int) -> list[Order]:
    return list(
        db.session.execute(
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.placed_at.desc())
        ).scalars().all()
    )


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


def admin_order_query(
    *,
    q: str | None = None,
    status: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> Select:
    query = select(Order)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(Order.order_number.ilike(like))
    if status:
        query = query.where(Order.status == status)
    if from_date:
        query = query.where(Order.placed_at >= from_date)
    if to_date:
        query = query.where(Order.placed_at <= to_date)
    return query.order_by(Order.placed_at.desc(), Order.id.desc())


def count_orders(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(Order.id)).order_by(None)
        ).scalar()
        or 0
    )


def page_orders(query: Select, page: int, per_page: int) -> list[Order]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


def order_by_id(order_id: int) -> Order | None:
    return db.session.get(Order, order_id)


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------


def inventory_query(
    *, low_stock: bool = False, out_of_stock: bool = False, q: str | None = None
) -> Select:
    query = select(Inventory).join(Product, Product.id == Inventory.product_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if out_of_stock:
        query = query.where(Inventory.quantity - Inventory.reserved_quantity <= 0)
    elif low_stock:
        query = query.where(
            Inventory.quantity - Inventory.reserved_quantity <= Inventory.low_stock_threshold
        )
    return query.order_by(Inventory.id)


def count_inventory(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(Inventory.id)).order_by(None)
        ).scalar()
        or 0
    )


def page_inventory(query: Select, page: int, per_page: int) -> list[Inventory]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


def inventory_by_id(inventory_id: int) -> Inventory | None:
    return db.session.get(Inventory, inventory_id)


def movements_for(inventory_id: int) -> list[InventoryMovement]:
    return list(
        db.session.execute(
            select(InventoryMovement)
            .where(InventoryMovement.inventory_id == inventory_id)
            .order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc())
        ).scalars().all()
    )


def add_movement(movement: InventoryMovement) -> InventoryMovement:
    db.session.add(movement)
    return movement


# ---------------------------------------------------------------------------
# Coupons
# ---------------------------------------------------------------------------


def all_coupons() -> list[Coupon]:
    return list(
        db.session.execute(select(Coupon).order_by(Coupon.id.desc())).scalars().all()
    )


def coupon_by_id(coupon_id: int) -> Coupon | None:
    return db.session.get(Coupon, coupon_id)


def coupon_by_code(code: str) -> Coupon | None:
    return db.session.execute(
        select(Coupon).where(Coupon.code == code.strip().upper())
    ).scalar_one_or_none()


def add_coupon(coupon: Coupon) -> Coupon:
    db.session.add(coupon)
    return coupon


def redemptions_for(coupon_id: int) -> list[CouponRedemption]:
    return list(
        db.session.execute(
            select(CouponRedemption).where(CouponRedemption.coupon_id == coupon_id)
        ).scalars().all()
    )


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------


def review_query(status: str | None = None) -> Select:
    query = select(Review)
    if status:
        query = query.where(Review.status == status)
    return query.order_by(Review.created_at.desc(), Review.id.desc())


def count_reviews(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(Review.id)).order_by(None)
        ).scalar()
        or 0
    )


def page_reviews(query: Select, page: int, per_page: int) -> list[Review]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


def review_by_id(review_id: int) -> Review | None:
    return db.session.get(Review, review_id)


def approved_rating_stats(product_id: int) -> tuple[float, int]:
    rows = db.session.execute(
        select(Review.rating).where(
            Review.product_id == product_id, Review.status == "approved"
        )
    ).scalars().all()
    if not rows:
        return 0.0, 0
    return round(sum(rows) / len(rows), 1), len(rows)


# ---------------------------------------------------------------------------
# Admin users and audit logs
# ---------------------------------------------------------------------------


def admin_users() -> list[User]:
    return list(
        db.session.execute(
            select(User)
            .join(User.roles)
            .where(Role.name != "Customer", User.deleted_at.is_(None))
            .order_by(User.id)
        ).scalars().unique().all()
    )


def role_by_id(role_id: int) -> Role | None:
    return db.session.get(Role, role_id)


def audit_query(
    *,
    user_id: int | None = None,
    entity_type: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> Select:
    query = select(AuditLog)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if from_date:
        query = query.where(AuditLog.created_at >= from_date)
    if to_date:
        query = query.where(AuditLog.created_at <= to_date)
    return query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())


def count_audit(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(AuditLog.id)).order_by(None)
        ).scalar()
        or 0
    )


def page_audit(query: Select, page: int, per_page: int) -> list[AuditLog]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


# ---------------------------------------------------------------------------
# Analytics and reports
# ---------------------------------------------------------------------------


def revenue_in_range(start: datetime, end: datetime) -> int:
    return int(
        db.session.execute(
            select(func.coalesce(func.sum(Order.total_cents), 0)).where(
                Order.placed_at >= start,
                Order.placed_at <= end,
                Order.status.notin_(["cancelled", "refunded"]),
            )
        ).scalar()
        or 0
    )


def orders_in_range(start: datetime, end: datetime) -> list[Order]:
    return list(
        db.session.execute(
            select(Order)
            .where(Order.placed_at >= start, Order.placed_at <= end)
            .order_by(Order.placed_at)
        ).scalars().all()
    )


def count_orders_in_range(start: datetime, end: datetime) -> int:
    return int(
        db.session.execute(
            select(func.count(Order.id)).where(
                Order.placed_at >= start, Order.placed_at <= end
            )
        ).scalar()
        or 0
    )


def count_customers() -> int:
    return int(
        db.session.execute(
            select(func.count(func.distinct(User.id)))
            .join(User.roles)
            .where(Role.name == "Customer", User.deleted_at.is_(None))
        ).scalar()
        or 0
    )


def count_products_all() -> int:
    return int(
        db.session.execute(
            select(func.count(Product.id)).where(Product.deleted_at.is_(None))
        ).scalar()
        or 0
    )


def count_orders_by_status(status: str) -> int:
    return int(
        db.session.execute(
            select(func.count(Order.id)).where(Order.status == status)
        ).scalar()
        or 0
    )


def low_stock_count() -> int:
    return int(
        db.session.execute(
            select(func.count(Inventory.id)).where(
                Inventory.quantity - Inventory.reserved_quantity
                <= Inventory.low_stock_threshold,
                Inventory.quantity - Inventory.reserved_quantity > 0,
            )
        ).scalar()
        or 0
    )


def out_of_stock_count() -> int:
    return int(
        db.session.execute(
            select(func.count(Inventory.id)).where(
                Inventory.quantity - Inventory.reserved_quantity <= 0
            )
        ).scalar()
        or 0
    )


def top_products(start: datetime, end: datetime, limit: int = 5) -> list[tuple[str, int, int]]:
    rows = db.session.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.total_cents),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.placed_at >= start,
            Order.placed_at <= end,
            Order.status.notin_(["cancelled", "refunded"]),
        )
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    ).all()
    return [(name, int(quantity or 0), int(total or 0)) for name, quantity, total in rows]


def top_categories(start: datetime, end: datetime, limit: int = 5) -> list[tuple[str, int]]:
    rows = db.session.execute(
        select(Category.name, func.sum(OrderItem.total_cents))
        .join(Product, Product.id == OrderItem.product_id)
        .join(Category, Category.id == Product.category_id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.placed_at >= start,
            Order.placed_at <= end,
            Order.status.notin_(["cancelled", "refunded"]),
        )
        .group_by(Category.name)
        .order_by(func.sum(OrderItem.total_cents).desc())
        .limit(limit)
    ).all()
    return [(name, int(total or 0)) for name, total in rows]


def recent_orders(limit: int = 5) -> list[Order]:
    return list(
        db.session.execute(
            select(Order).order_by(Order.placed_at.desc(), Order.id.desc()).limit(limit)
        ).scalars().all()
    )


def recent_customers(limit: int = 5) -> list[User]:
    return list(
        db.session.execute(
            select(User)
            .join(User.roles)
            .where(Role.name == "Customer", User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .limit(limit)
        ).scalars().unique().all()
    )


def inventory_rows() -> list[Inventory]:
    return list(db.session.execute(select(Inventory).order_by(Inventory.id)).scalars().all())


__all__ = [
    "admin_product_query",
    "count_products",
    "page_products",
    "product_by_id",
    "sku_in_use",
    "add_product",
    "add_image",
    "add_variant",
    "category_by_id",
    "brand_by_id",
    "all_categories",
    "add_category",
    "all_brands",
    "add_brand",
    "products_in_category",
    "customer_query",
    "count_users",
    "page_users",
    "user_by_id",
    "total_spent",
    "orders_for_user",
    "admin_order_query",
    "count_orders",
    "page_orders",
    "order_by_id",
    "inventory_query",
    "count_inventory",
    "page_inventory",
    "inventory_by_id",
    "movements_for",
    "add_movement",
    "all_coupons",
    "coupon_by_id",
    "coupon_by_code",
    "add_coupon",
    "redemptions_for",
    "review_query",
    "count_reviews",
    "page_reviews",
    "review_by_id",
    "approved_rating_stats",
    "admin_users",
    "role_by_id",
    "audit_query",
    "count_audit",
    "page_audit",
    "revenue_in_range",
    "orders_in_range",
    "count_orders_in_range",
    "count_customers",
    "count_products_all",
    "count_orders_by_status",
    "low_stock_count",
    "out_of_stock_count",
    "top_products",
    "top_categories",
    "recent_orders",
    "recent_customers",
    "inventory_rows",
]
