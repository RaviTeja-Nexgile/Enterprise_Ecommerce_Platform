"""Categories, brands, products, images, variants, attributes and inventory."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel, JSONType, UTCDateTime


class Category(BaseModel):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    parent: Mapped["Category | None"] = relationship(
        remote_side="Category.id", back_populates="children"
    )
    children: Mapped[list["Category"]] = relationship(back_populates="parent")
    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Brand(BaseModel):
    __tablename__ = "brands"

    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    products: Mapped[list["Product"]] = relationship(back_populates="brand")


class Product(BaseModel):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_status_category_id", "status", "category_id"),
        Index("ix_products_brand_id", "brand_id"),
        Index("ix_products_name", "name"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(280), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    short_description: Mapped[str | None] = mapped_column(String(500))
    brand_id: Mapped[int | None] = mapped_column(ForeignKey("brands.id", ondelete="SET NULL"))
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL")
    )
    regular_price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    discounted_price_cents: Mapped[int | None] = mapped_column(Integer)
    discount_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    is_featured: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_new_arrival: Mapped[bool] = mapped_column(default=False, nullable=False)
    rating_average: Mapped[float] = mapped_column(default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    brand: Mapped["Brand | None"] = relationship(back_populates="products", lazy="joined")
    category: Mapped["Category | None"] = relationship(
        back_populates="products", lazy="joined"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    inventory: Mapped[list["Inventory"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(  # noqa: F821
        back_populates="product", cascade="all, delete-orphan"
    )

    @property
    def effective_price_cents(self) -> int:
        return (
            self.discounted_price_cents
            if self.discounted_price_cents is not None
            else self.regular_price_cents
        )


class ProductImage(BaseModel):
    __tablename__ = "product_images"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped[Product] = relationship(back_populates="images")


class ProductVariant(BaseModel):
    __tablename__ = "product_variants"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attributes: Mapped[dict | None] = mapped_column(JSONType)
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False)

    product: Mapped[Product] = relationship(back_populates="variants")
    inventory: Mapped[list["Inventory"]] = relationship(
        back_populates="variant", cascade="all, delete-orphan"
    )
    attribute_values: Mapped[list["ProductAttributeValue"]] = relationship(
        secondary="product_variant_values", back_populates="variants", lazy="selectin"
    )


class ProductAttribute(BaseModel):
    __tablename__ = "product_attributes"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    values: Mapped[list["ProductAttributeValue"]] = relationship(
        back_populates="attribute", cascade="all, delete-orphan"
    )


class ProductAttributeValue(BaseModel):
    __tablename__ = "product_attribute_values"
    __table_args__ = (UniqueConstraint("attribute_id", "value", name="uq_attribute_value"),)

    attribute_id: Mapped[int] = mapped_column(
        ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value: Mapped[str] = mapped_column(String(100), nullable=False)

    attribute: Mapped[ProductAttribute] = relationship(back_populates="values")
    variants: Mapped[list[ProductVariant]] = relationship(
        secondary="product_variant_values", back_populates="attribute_values"
    )


class ProductVariantValue(BaseModel):
    __tablename__ = "product_variant_values"
    __table_args__ = (
        UniqueConstraint("variant_id", "attribute_value_id", name="uq_variant_value"),
    )

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attribute_value_id: Mapped[int] = mapped_column(
        ForeignKey("product_attribute_values.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


class Inventory(BaseModel):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("product_id", "variant_id", name="uq_inventory_product_variant"),
        Index("ix_inventory_product_id", "product_id"),
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    variant_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_variants.id", ondelete="CASCADE")
    )
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    product: Mapped[Product] = relationship(back_populates="inventory")
    variant: Mapped[ProductVariant | None] = relationship(back_populates="inventory")
    movements: Mapped[list["InventoryMovement"]] = relationship(
        back_populates="inventory", cascade="all, delete-orphan"
    )

    @property
    def available_quantity(self) -> int:
        return max(self.quantity - self.reserved_quantity, 0)


class InventoryMovement(BaseModel):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        Index("ix_inventory_movements_inventory_id_created_at", "inventory_id", "created_at"),
    )

    inventory_id: Mapped[int] = mapped_column(
        ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False
    )
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    inventory: Mapped[Inventory] = relationship(back_populates="movements")


__all__ = [
    "Category",
    "Brand",
    "Product",
    "ProductImage",
    "ProductVariant",
    "ProductAttribute",
    "ProductAttributeValue",
    "ProductVariantValue",
    "Inventory",
    "InventoryMovement",
]
