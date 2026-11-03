"""The seed script: demo accounts, sample data and idempotency (requirements 22.1-22.4)."""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.extensions import db
from app.models import (
    Brand,
    Category,
    Coupon,
    InventoryMovement,
    Order,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    Role,
    User,
)
from app.security import verify_password
from app.seed import seed_database


def _count(model) -> int:
    return db.session.execute(select(func.count()).select_from(model)).scalar_one()


def test_seed_creates_the_demo_accounts(app):
    with app.app_context():
        result = seed_database()
        assert result["seeded"] is True

        admin = db.session.execute(
            select(User).where(User.email == "admin@example.com")
        ).scalar_one()
        customer = db.session.execute(
            select(User).where(User.email == "customer@example.com")
        ).scalar_one()

        assert admin.has_role("Super Admin")
        assert customer.has_role("Customer")
        assert verify_password("Admin@12345", admin.password_hash)
        assert verify_password("Customer@12345", customer.password_hash)


def test_seed_hashes_passwords(app):
    with app.app_context():
        seed_database()
        admin = db.session.execute(
            select(User).where(User.email == "admin@example.com")
        ).scalar_one()
        assert admin.password_hash != "Admin@12345"
        assert admin.password_hash.startswith("$argon2id$")


def test_seed_creates_the_other_test_logins(app):
    with app.app_context():
        seed_database()
        expected = {
            "manager@example.com": ("Manager@12345", "Admin"),
            "inventory@example.com": ("Inventory@12345", "Inventory Manager"),
            "orders@example.com": ("Orders@12345", "Order Manager"),
        }
        for email, (password, role) in expected.items():
            user = db.session.execute(
                select(User).where(User.email == email)
            ).scalar_one()
            assert user.has_role(role)
            assert verify_password(password, user.password_hash)


def test_seed_creates_the_five_roles(app):
    with app.app_context():
        seed_database()
        names = {
            role.name for role in db.session.execute(select(Role)).scalars().all()
        }
        assert names == {
            "Super Admin",
            "Admin",
            "Inventory Manager",
            "Order Manager",
            "Customer",
        }


def test_seed_creates_catalog_sample_data(app):
    with app.app_context():
        seed_database()
        assert _count(Category) >= 8
        assert _count(Brand) >= 2
        published = db.session.execute(
            select(func.count()).select_from(Product).where(Product.status == "published")
        ).scalar_one()
        assert published >= 30
        assert _count(ProductImage) >= published
        assert _count(ProductVariant) > 0


def test_seed_creates_orders_reviews_coupons_and_movements(app):
    with app.app_context():
        seed_database()
        assert _count(Order) > 0
        statuses = {
            status
            for status in db.session.execute(select(Order.status)).scalars().all()
        }
        assert len(statuses) >= 3
        assert _count(Review) > 0
        assert _count(Coupon) > 0
        assert _count(InventoryMovement) > 0


def test_seed_is_idempotent(app):
    with app.app_context():
        seed_database()
        users_before = _count(User)
        products_before = _count(Product)
        orders_before = _count(Order)

        result = seed_database()

        assert result["seeded"] is False
        assert _count(User) == users_before
        assert _count(Product) == products_before
        assert _count(Order) == orders_before


def test_seed_leaves_existing_data_unchanged(app):
    with app.app_context():
        existing = User(
            email="someone@example.com",
            password_hash="not-a-real-hash",
            first_name="Some",
            last_name="One",
            is_active=True,
        )
        db.session.add(existing)
        db.session.commit()

        result = seed_database()

        assert result["seeded"] is False
        assert _count(User) == 1
        assert _count(Product) == 0
        row = db.session.execute(
            select(User).where(User.email == "someone@example.com")
        ).scalar_one()
        assert row.password_hash == "not-a-real-hash"


def test_seed_skips_test_logins_in_production(app, monkeypatch):
    monkeypatch.setenv("NODE_ENV", "production")
    with app.app_context():
        seed_database()
        emails = {
            email
            for email in db.session.execute(select(User.email)).scalars().all()
        }
        assert "admin@example.com" not in emails
        assert "customer@example.com" not in emails
        assert "manager@example.com" not in emails
        assert "inventory@example.com" not in emails
        assert "orders@example.com" not in emails


def test_seed_command_runs_from_the_cli(app):
    runner = app.test_cli_runner()
    result = runner.invoke(args=["seed"])
    assert result.exit_code == 0
    assert "Seeded" in result.output

    with app.app_context():
        assert _count(User) > 0


@pytest.mark.parametrize("email", ["admin@example.com", "customer@example.com"])
def test_demo_accounts_are_active(app, email):
    with app.app_context():
        seed_database()
        user = db.session.execute(select(User).where(User.email == email)).scalar_one()
        assert user.is_active is True


def test_seeded_image_urls_are_served(app, client):
    with app.app_context():
        seed_database()
        urls = {
            url
            for url in db.session.execute(select(ProductImage.url)).scalars().all()
        }
        assert urls
        for url in sorted(urls)[:5]:
            response = client.get(url)
            assert response.status_code == 200, url
            assert response.mimetype == "image/svg+xml"
            response.close()
