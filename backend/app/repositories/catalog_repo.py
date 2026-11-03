"""Catalog queries: products, categories, brands, inventory and reviews."""

from __future__ import annotations

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import (
    Brand,
    Category,
    Inventory,
    InventoryMovement,
    Product,
    ProductImage,
    ProductVariant,
    Review,
)


def _published() -> Select:
    return select(Product).where(
        Product.status == "published", Product.deleted_at.is_(None)
    )


def get_product(identifier: str | int) -> Product | None:
    """Find a published product by id or slug."""
    query = _published()
    if isinstance(identifier, int) or str(identifier).isdigit():
        query = query.where(Product.id == int(identifier))
    else:
        query = query.where(Product.slug == str(identifier))
    return db.session.execute(query).scalar_one_or_none()


def get_product_any(identifier: int) -> Product | None:
    """Find a product by id whatever its status (admin use)."""
    return db.session.get(Product, identifier)


def product_query(
    *,
    q: str | None = None,
    category: str | None = None,
    brand: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    in_stock: bool | None = None,
    min_rating: float | None = None,
    sort: str = "newest",
) -> Select:
    query = _published()
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                Product.name.ilike(like),
                Product.sku.ilike(like),
                Product.description.ilike(like),
            )
        )
    if category:
        category_row = get_category_by_slug_or_id(category)
        if category_row is None:
            query = query.where(Product.id == -1)
        else:
            ids = [category_row.id] + [child.id for child in category_row.children]
            query = query.where(Product.category_id.in_(ids))
    if brand:
        brand_row = get_brand_by_name_or_id(brand)
        if brand_row is None:
            query = query.where(Product.id == -1)
        else:
            query = query.where(Product.brand_id == brand_row.id)
    if min_price is not None:
        query = query.where(Product.regular_price_cents >= min_price)
    if max_price is not None:
        query = query.where(Product.regular_price_cents <= max_price)
    if min_rating is not None:
        query = query.where(Product.rating_average >= min_rating)
    if in_stock:
        in_stock_ids = select(Inventory.product_id).where(
            Inventory.variant_id.is_(None),
            Inventory.quantity - Inventory.reserved_quantity > 0,
        )
        query = query.where(Product.id.in_(in_stock_ids))

    if sort == "price_asc":
        query = query.order_by(Product.regular_price_cents.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.regular_price_cents.desc())
    elif sort == "popular":
        query = query.order_by(Product.rating_count.desc(), Product.id.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating_average.desc(), Product.id.desc())
    else:
        query = query.order_by(Product.created_at.desc(), Product.id.desc())
    return query


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


def search_products(q: str, limit: int = 6) -> list[Product]:
    like = f"%{q.strip()}%"
    return list(
        db.session.execute(
            _published()
            .where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
            .order_by(Product.rating_count.desc())
            .limit(limit)
        ).scalars().all()
    )


def first_image_url(product: Product) -> str | None:
    if product.images:
        return product.images[0].url
    return None


def get_category_by_slug_or_id(value: str | int) -> Category | None:
    query = select(Category).where(Category.deleted_at.is_(None))
    if isinstance(value, int) or str(value).isdigit():
        query = query.where(Category.id == int(value))
    else:
        query = query.where(Category.slug == str(value))
    return db.session.execute(query).scalar_one_or_none()


def get_brand_by_name_or_id(value: str | int) -> Brand | None:
    query = select(Brand).where(Brand.deleted_at.is_(None))
    if isinstance(value, int) or str(value).isdigit():
        query = query.where(Brand.id == int(value))
    else:
        query = query.where(Brand.name == str(value))
    return db.session.execute(query).scalar_one_or_none()


def active_categories() -> list[Category]:
    return list(
        db.session.execute(
            select(Category)
            .where(Category.deleted_at.is_(None), Category.status == "active")
            .order_by(Category.sort_order, Category.name)
        ).scalars().all()
    )


def brands() -> list[Brand]:
    return list(
        db.session.execute(
            select(Brand).where(Brand.deleted_at.is_(None)).order_by(Brand.name)
        ).scalars().all()
    )


def product_count_for_category(category_id: int) -> int:
    return int(
        db.session.execute(
            select(func.count(Product.id)).where(
                Product.category_id == category_id,
                Product.status == "published",
                Product.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )


def inventory_for(product_id: int, variant_id: int | None = None) -> Inventory | None:
    return db.session.execute(
        select(Inventory).where(
            Inventory.product_id == product_id, Inventory.variant_id == variant_id
        )
    ).scalar_one_or_none()


def inventory_for_update(product_id: int, variant_id: int | None = None) -> Inventory | None:
    """Read the inventory row with a write lock (SQLite serialises writers)."""
    return db.session.execute(
        select(Inventory)
        .where(Inventory.product_id == product_id, Inventory.variant_id == variant_id)
        .with_for_update()
    ).scalar_one_or_none()


def available_quantity(product_id: int, variant_id: int | None = None) -> int:
    row = inventory_for(product_id, variant_id)
    return row.available_quantity if row else 0


def add_movement(
    inventory: Inventory,
    quantity_change: int,
    reason: str,
    created_by: int | None = None,
) -> InventoryMovement:
    movement = InventoryMovement(
        inventory_id=inventory.id,
        quantity_change=quantity_change,
        reason=reason,
        created_by=created_by,
    )
    db.session.add(movement)
    return movement


def approved_reviews(product_id: int) -> list[Review]:
    return list(
        db.session.execute(
            select(Review)
            .where(Review.product_id == product_id, Review.status == "approved")
            .order_by(Review.created_at.desc())
        ).scalars().all()
    )


def related_products(product: Product, limit: int = 6) -> list[Product]:
    return list(
        db.session.execute(
            _published()
            .where(Product.id != product.id, Product.category_id == product.category_id)
            .order_by(Product.rating_count.desc())
            .limit(limit)
        ).scalars().all()
    )


def featured_products(limit: int = 8) -> list[Product]:
    return list(
        db.session.execute(
            _published().where(Product.is_featured.is_(True)).limit(limit)
        ).scalars().all()
    )


def best_selling_products(limit: int = 8) -> list[Product]:
    return list(
        db.session.execute(
            _published().order_by(Product.rating_count.desc()).limit(limit)
        ).scalars().all()
    )


def new_arrival_products(limit: int = 8) -> list[Product]:
    return list(
        db.session.execute(
            _published()
            .where(Product.is_new_arrival.is_(True))
            .order_by(Product.created_at.desc())
            .limit(limit)
        ).scalars().all()
    )


def discounted_products(limit: int = 8) -> list[Product]:
    return list(
        db.session.execute(
            _published()
            .where(Product.discount_percentage > 0)
            .order_by(Product.discount_percentage.desc())
            .limit(limit)
        ).scalars().all()
    )


def product_with_details(product_id: int) -> Product | None:
    return db.session.execute(
        select(Product)
        .options(joinedload(Product.images), joinedload(Product.variants))
        .where(Product.id == product_id)
    ).unique().scalar_one_or_none()


def variant_by_id(variant_id: int) -> ProductVariant | None:
    return db.session.get(ProductVariant, variant_id)


def image_by_id(image_id: int) -> ProductImage | None:
    return db.session.get(ProductImage, image_id)


__all__ = [
    "get_product",
    "get_product_any",
    "product_query",
    "count_products",
    "page_products",
    "search_products",
    "first_image_url",
    "get_category_by_slug_or_id",
    "get_brand_by_name_or_id",
    "active_categories",
    "brands",
    "product_count_for_category",
    "inventory_for",
    "inventory_for_update",
    "available_quantity",
    "add_movement",
    "approved_reviews",
    "related_products",
    "featured_products",
    "best_selling_products",
    "new_arrival_products",
    "discounted_products",
    "product_with_details",
    "variant_by_id",
    "image_by_id",
]
