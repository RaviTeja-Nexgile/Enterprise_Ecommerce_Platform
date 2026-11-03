"""Helpers shared by the API test modules.

Each module seeds only the rows it needs, so tests never depend on how many
rows a whole table holds (other tasks write to the same database).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select

from app.extensions import db
from app.models import (
    Brand,
    Category,
    Inventory,
    Permission,
    Product,
    ProductImage,
    Role,
    User,
    utcnow,
)
from app.security import hash_password

PASSWORD = "Customer@12345"
ADMIN_PASSWORD = "Admin@12345"

PERMISSIONS = [
    "dashboard.view",
    "products.manage",
    "categories.manage",
    "customers.manage",
    "orders.manage",
    "inventory.manage",
    "reports.view",
    "coupons.manage",
    "reviews.moderate",
    "users.manage",
    "audit.view",
]

ROLE_PERMISSIONS = {
    "Super Admin": PERMISSIONS,
    "Admin": [
        "dashboard.view",
        "products.manage",
        "categories.manage",
        "customers.manage",
        "orders.manage",
        "reports.view",
        "coupons.manage",
        "reviews.moderate",
    ],
    "Inventory Manager": ["inventory.manage"],
    "Order Manager": ["orders.manage"],
    "Customer": [],
}


def seed_roles() -> dict[str, Role]:
    """Create the five roles and their permissions, reusing rows that exist."""
    permissions = {}
    for name in PERMISSIONS:
        permission = db.session.execute(
            select(Permission).where(Permission.name == name)
        ).scalar_one_or_none()
        if permission is None:
            permission = Permission(name=name, description=name)
            db.session.add(permission)
        permissions[name] = permission
    db.session.flush()
    roles = {}
    for role_name, permission_names in ROLE_PERMISSIONS.items():
        role = db.session.execute(
            select(Role).where(Role.name == role_name)
        ).scalar_one_or_none()
        if role is None:
            role = Role(name=role_name, description=role_name)
            db.session.add(role)
        role.permissions = [permissions[name] for name in permission_names]
        roles[role_name] = role
    db.session.flush()
    return roles


def make_user(
    email: str,
    role: str = "Customer",
    password: str = PASSWORD,
    *,
    roles: dict[str, Role] | None = None,
    is_active: bool = True,
    first_name: str = "Test",
    last_name: str = "User",
) -> User:
    roles = roles or seed_roles()
    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        phone="+1 555 0199",
        is_active=is_active,
    )
    user.roles = [roles[role]]
    db.session.add(user)
    db.session.flush()
    return user


def make_category(name: str = "Test Category", slug: str = "test-category") -> Category:
    category = Category(name=name, slug=slug, status="active", sort_order=0)
    db.session.add(category)
    db.session.flush()
    return category


def make_brand(name: str = "Test Brand") -> Brand:
    brand = Brand(name=name)
    db.session.add(brand)
    db.session.flush()
    return brand


def make_product(
    name: str = "Test Product",
    *,
    sku: str = "SKU-TEST-1",
    slug: str = "test-product",
    price_cents: int = 5000,
    discounted_price_cents: int | None = None,
    stock: int = 10,
    category: Category | None = None,
    brand: Brand | None = None,
    status: str = "published",
) -> Product:
    product = Product(
        name=name,
        sku=sku,
        slug=slug,
        description=f"{name} description",
        short_description=f"{name} short",
        category_id=category.id if category else None,
        brand_id=brand.id if brand else None,
        regular_price_cents=price_cents,
        discounted_price_cents=discounted_price_cents,
        discount_percentage=0,
        status=status,
        rating_average=4.5,
        rating_count=3,
    )
    db.session.add(product)
    db.session.flush()
    db.session.add(
        ProductImage(
            product_id=product.id,
            url=f"/uploads/{slug}-1.svg",
            alt_text=name,
            sort_order=0,
        )
    )
    db.session.add(
        Inventory(
            product_id=product.id,
            variant_id=None,
            quantity=stock,
            reserved_quantity=0,
            low_stock_threshold=3,
        )
    )
    db.session.flush()
    return product


def login(client, email: str, password: str = PASSWORD) -> dict[str, Any]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.get_json()
    return response.get_json()


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def token_for(app, email: str, password: str = PASSWORD) -> str:
    """Sign in on a throwaway client so the caller's session is untouched."""
    response = app.test_client(use_cookies=False).post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["access_token"]


def admin_headers(client, email: str = "admin@example.com") -> dict[str, str]:
    return auth_headers(login(client, email, ADMIN_PASSWORD)["access_token"])


def customer_headers(client, email: str = "customer@example.com") -> dict[str, str]:
    return auth_headers(login(client, email, PASSWORD)["access_token"])


def now() -> Any:
    return utcnow()


__all__ = [
    "PASSWORD",
    "ADMIN_PASSWORD",
    "PERMISSIONS",
    "ROLE_PERMISSIONS",
    "seed_roles",
    "make_user",
    "make_category",
    "make_brand",
    "make_product",
    "login",
    "auth_headers",
    "token_for",
    "admin_headers",
    "customer_headers",
    "now",
]
