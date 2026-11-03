"""Seed the database with the demo accounts and sample data.

The seed is idempotent: when the database already holds users it does nothing
and leaves every row untouched (requirement 22.4). The five test logins are
never created when ``NODE_ENV`` is ``production``.
"""

from __future__ import annotations

import html
import os
import random
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from .extensions import db
from .models import (
    Address,
    AuditLog,
    Brand,
    Cart,
    CartItem,
    Category,
    Coupon,
    CouponRedemption,
    Inventory,
    InventoryMovement,
    NewsletterSubscriber,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    Permission,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductImage,
    ProductVariant,
    ProductVariantValue,
    Review,
    Role,
    User,
    Wishlist,
    WishlistItem,
    utcnow,
)
from .security import hash_password

BACKEND_DIR = Path(__file__).resolve().parent.parent
SEED_IMAGES_DIR = BACKEND_DIR / "seed" / "images"

# ---------------------------------------------------------------------------
# Roles and permissions (design.md "Roles and permissions")
# ---------------------------------------------------------------------------

PERMISSIONS: dict[str, str] = {
    "dashboard.view": "See the admin dashboard overview",
    "products.manage": "Create, edit, publish and archive products",
    "categories.manage": "Manage categories and brands",
    "customers.manage": "See customers and change their account status",
    "orders.manage": "See orders, change their status and refund them",
    "inventory.manage": "See and adjust stock",
    "reports.view": "See reports and export them",
    "coupons.manage": "Create and activate coupons",
    "reviews.moderate": "Approve or reject reviews",
    "users.manage": "Manage admin accounts",
    "audit.view": "Read the audit log",
}

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "Super Admin": list(PERMISSIONS.keys()),
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

ROLE_DESCRIPTIONS = {
    "Super Admin": "Owns the platform and manages admin accounts",
    "Admin": "Manages the catalog, orders, customers and reports",
    "Inventory Manager": "Keeps stock accurate",
    "Order Manager": "Fulfils and refunds orders",
    "Customer": "Shops on the storefront",
}

# ---------------------------------------------------------------------------
# Test logins (design.md "Test logins")
# ---------------------------------------------------------------------------

TEST_LOGINS = [
    {
        "email": "admin@example.com",
        "password": "Admin@12345",
        "first_name": "Avery",
        "last_name": "Admin",
        "phone": "+1 555 0100",
        "role": "Super Admin",
    },
    {
        "email": "customer@example.com",
        "password": "Customer@12345",
        "first_name": "Casey",
        "last_name": "Customer",
        "phone": "+1 555 0101",
        "role": "Customer",
    },
    {
        "email": "manager@example.com",
        "password": "Manager@12345",
        "first_name": "Morgan",
        "last_name": "Manager",
        "phone": "+1 555 0102",
        "role": "Admin",
    },
    {
        "email": "inventory@example.com",
        "password": "Inventory@12345",
        "first_name": "Indira",
        "last_name": "Stock",
        "phone": "+1 555 0103",
        "role": "Inventory Manager",
    },
    {
        "email": "orders@example.com",
        "password": "Orders@12345",
        "first_name": "Oscar",
        "last_name": "Fulfilment",
        "phone": "+1 555 0104",
        "role": "Order Manager",
    },
]

SAMPLE_CUSTOMERS = [
    ("jordan.lee@example.com", "Jordan", "Lee", "+1 555 0110"),
    ("sam.rivera@example.com", "Sam", "Rivera", "+1 555 0111"),
    ("priya.patel@example.com", "Priya", "Patel", "+1 555 0112"),
    ("noah.brown@example.com", "Noah", "Brown", "+1 555 0113"),
    ("mia.garcia@example.com", "Mia", "Garcia", "+1 555 0114"),
]
SAMPLE_CUSTOMER_PASSWORD = "Customer@12345"

# ---------------------------------------------------------------------------
# Catalog sample data
# ---------------------------------------------------------------------------

CATEGORIES = [
    ("Electronics", "electronics", "Phones, audio and everyday tech"),
    ("Home & Kitchen", "home-kitchen", "Cookware, storage and small appliances"),
    ("Fashion", "fashion", "Clothing, shoes and accessories"),
    ("Beauty", "beauty", "Skincare, haircare and fragrance"),
    ("Sports & Outdoors", "sports-outdoors", "Training, camping and cycling"),
    ("Books", "books", "Fiction, business and reference"),
    ("Toys & Games", "toys-games", "Building sets, puzzles and games"),
    ("Grocery", "grocery", "Pantry staples and specialty food"),
]

BRANDS = [
    ("Northwind", "Everyday electronics built to last"),
    ("Lumen", "Lighting and home comfort"),
    ("Atlas Wear", "Performance clothing and footwear"),
    ("Verdant", "Natural skincare and haircare"),
    ("Summit", "Outdoor and training gear"),
    ("Paperhouse", "Books and stationery"),
    ("Playcraft", "Toys, puzzles and games"),
    ("Harvest Lane", "Pantry staples and specialty food"),
]

# (name, category slug, brand name, regular price cents, discount percent, short description)
PRODUCTS = [
    ("Aurora Wireless Headphones", "electronics", "Northwind", 12999, 20, "Over-ear noise cancelling headphones with 30-hour battery"),
    ("Pulse Bluetooth Speaker", "electronics", "Northwind", 7999, 0, "Portable speaker with deep bass and IPX7 water resistance"),
    ("Nimbus Smart Watch", "electronics", "Northwind", 19999, 15, "Fitness tracking, heart rate and a 7-day battery"),
    ("Volt USB-C Charger 65W", "electronics", "Northwind", 3999, 0, "Compact GaN charger for laptop and phone"),
    ("Halo Desk Lamp", "home-kitchen", "Lumen", 5499, 10, "Dimmable LED lamp with a warm and cool light mode"),
    ("Copper Pour-Over Kettle", "home-kitchen", "Lumen", 6499, 0, "Gooseneck kettle with precise temperature control"),
    ("Stoneware Dinner Set", "home-kitchen", "Lumen", 8999, 25, "16-piece stoneware set for four people"),
    ("Linen Throw Blanket", "home-kitchen", "Lumen", 4599, 0, "Breathable washed linen throw in oatmeal"),
    ("Atlas Trail Runner", "fashion", "Atlas Wear", 11999, 20, "Lightweight trail shoes with a grippy outsole"),
    ("Merino Crew Sweater", "fashion", "Atlas Wear", 8499, 0, "Fine merino wool sweater that resists odour"),
    ("Canvas Weekender Bag", "fashion", "Atlas Wear", 9999, 10, "Waxed canvas duffel with leather handles"),
    ("Everyday Denim Jacket", "fashion", "Atlas Wear", 7499, 0, "Classic denim jacket with a relaxed fit"),
    ("Verdant Hydrating Serum", "beauty", "Verdant", 3499, 15, "Hyaluronic acid serum for dry skin"),
    ("Calm Lavender Body Oil", "beauty", "Verdant", 2799, 0, "Cold-pressed body oil with lavender"),
    ("Botanical Shampoo Bar", "beauty", "Verdant", 1499, 0, "Plastic-free shampoo bar for normal hair"),
    ("Rose Clay Face Mask", "beauty", "Verdant", 2299, 10, "Gentle clay mask that calms redness"),
    ("Summit 30L Daypack", "sports-outdoors", "Summit", 8999, 15, "Ventilated daypack for day hikes"),
    ("Titan Adjustable Dumbbell", "sports-outdoors", "Summit", 14999, 0, "Adjustable dumbbell from 5 to 25 lb"),
    ("Trailhead Camp Stove", "sports-outdoors", "Summit", 6999, 0, "Compact canister stove for two people"),
    ("Summit Yoga Mat", "sports-outdoors", "Summit", 4999, 20, "Non-slip 6 mm mat with alignment lines"),
    ("The Quiet Ledger", "books", "Paperhouse", 1899, 0, "A novel about a small-town accountant"),
    ("Building Better Teams", "books", "Paperhouse", 2499, 10, "A practical guide to team habits"),
    ("Atlas of Small Cities", "books", "Paperhouse", 3299, 0, "Illustrated maps of overlooked places"),
    ("Weeknight Kitchen", "books", "Paperhouse", 2199, 0, "120 recipes for busy evenings"),
    ("Playcraft Wooden Blocks", "toys-games", "Playcraft", 3999, 0, "100 sanded hardwood blocks"),
    ("Skyline Puzzle 1000", "toys-games", "Playcraft", 2499, 10, "1000-piece city skyline puzzle"),
    ("Playcraft Board Game", "toys-games", "Playcraft", 4499, 0, "Strategy game for two to four players"),
    ("Harvest Olive Oil 1L", "grocery", "Harvest Lane", 1899, 0, "Cold-pressed extra virgin olive oil"),
    ("Harvest Coffee Beans 1kg", "grocery", "Harvest Lane", 2599, 15, "Medium roast whole-bean coffee"),
    ("Harvest Honey 500g", "grocery", "Harvest Lane", 1299, 0, "Raw wildflower honey"),
    ("Harvest Sea Salt 1kg", "grocery", "Harvest Lane", 899, 0, "Flaky sea salt from the coast"),
    ("Harvest Granola 750g", "grocery", "Harvest Lane", 1099, 0, "Oat and almond granola"),
]

VARIANT_PRODUCTS = {
    "Atlas Trail Runner": [("US 8", 11999), ("US 9", 11999), ("US 10", 12499)],
    "Merino Crew Sweater": [("Small", 8499), ("Medium", 8499), ("Large", 8999)],
    "Everyday Denim Jacket": [("Small", 7499), ("Medium", 7499), ("Large", 7999)],
    "Summit Yoga Mat": [("Charcoal", 4999), ("Sage", 4999)],
}

COUPONS = [
    ("WELCOME10", "percentage", 10, 0, 2000, 30, 100, 1, True),
    ("SAVE20", "fixed", 2000, 5000, None, 60, 50, 1, True),
    ("FREESHIP", "fixed", 500, 0, 500, 90, 200, 1, True),
    ("EXPIRED5", "percentage", 5, 0, 1000, -1, 10, 1, True),
    ("INACTIVE15", "percentage", 15, 0, 3000, 60, 20, 1, False),
]

ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]

REVIEW_COMMENTS = [
    "Exactly as described and arrived quickly.",
    "Good value for the price, I would buy it again.",
    "Works well, though the packaging could be better.",
    "Solid quality and a nice finish.",
    "Does the job and looks good on the shelf.",
]


def _slugify(value: str) -> str:
    out = []
    for char in value.lower():
        if char.isalnum():
            out.append(char)
        elif char in " -_/&":
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _is_production() -> bool:
    return (os.environ.get("NODE_ENV") or "").strip().lower() == "production"


_IMAGE_PALETTE = [
    ("#2563eb", "#1e3a8a"),
    ("#0f766e", "#134e4a"),
    ("#b45309", "#78350f"),
    ("#7c3aed", "#4c1d95"),
    ("#be123c", "#881337"),
    ("#0369a1", "#0c4a6e"),
    ("#4d7c0f", "#365314"),
    ("#c2410c", "#7c2d12"),
]


def _svg_image(label: str, index: int) -> str:
    """Return a small placeholder SVG for a seeded image."""
    start, end = _IMAGE_PALETTE[index % len(_IMAGE_PALETTE)]
    safe = html.escape(label, quote=True)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" '
        'viewBox="0 0 800 600" role="img">'
        f"<title>{safe}</title>"
        "<defs>"
        f'<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{start}"/>'
        f'<stop offset="1" stop-color="{end}"/>'
        "</linearGradient>"
        "</defs>"
        '<rect width="800" height="600" fill="url(#g)"/>'
        '<circle cx="640" cy="140" r="90" fill="#ffffff" fill-opacity="0.12"/>'
        '<circle cx="160" cy="470" r="130" fill="#ffffff" fill-opacity="0.08"/>'
        f'<text x="400" y="310" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" '
        f'font-size="40" font-weight="600" text-anchor="middle">{safe}</text>'
        "</svg>"
    )


def _write_image(upload_folder: Path, filename: str, label: str, index: int) -> None:
    destination = upload_folder / filename
    if destination.exists():
        return
    destination.write_text(_svg_image(label, index), encoding="utf-8")


def _seed_image_files() -> list[tuple[str, str, int]]:
    """Every image file the seed references, as ``(filename, label, palette)``.

    The URLs written into ``product_images``, ``categories`` and ``brands`` are
    ``/uploads/<filename>``, so this list is the single source of truth for the
    files that must exist in the uploads folder (design.md: product images are
    stored in ``backend/uploads/`` and served at ``/uploads/<file>``).
    """
    files: list[tuple[str, str, int]] = []
    for index, (name, slug, _description) in enumerate(CATEGORIES):
        files.append((f"category-{slug}.svg", name, index))
    for index, (name, _description) in enumerate(BRANDS):
        files.append((f"brand-{_slugify(name)}.svg", name, index))
    for index, (name, *_rest) in enumerate(PRODUCTS):
        slug = _slugify(name)
        for position in range(2):
            files.append((f"product-{slug}-{position + 1}.svg", name, index + position))
    return files


def _copy_seed_images(upload_folder: str) -> None:
    """Make sure every seeded image URL resolves to a file in the uploads folder.

    Sample images are copied from ``backend/seed/images`` when that folder is
    present; any image still missing is generated as a placeholder SVG, so a
    fresh checkout serves real images at ``/uploads/<file>`` (design.md).
    """
    target = Path(upload_folder)
    target.mkdir(parents=True, exist_ok=True)

    if SEED_IMAGES_DIR.exists():
        for image in SEED_IMAGES_DIR.glob("*"):
            if image.is_file():
                destination = target / image.name
                if not destination.exists():
                    shutil.copyfile(image, destination)

    for filename, label, index in _seed_image_files():
        _write_image(target, filename, label, index)


def seed_database(force: bool = False) -> dict:
    """Seed the database and return a summary of what happened.

    Returns ``{"seeded": bool, "reason": str, "users": int, "categories": int,
    "products": int, "orders": int}``.
    """
    existing_users = db.session.query(User).count()
    if existing_users and not force:
        # The rows are left untouched (requirement 22.4), but the image files
        # the seeded rows point at are still made available so their URLs
        # resolve on a database that was seeded by an earlier run.
        _copy_seed_images(_current_upload_folder())
        return {
            "seeded": False,
            "reason": "the database already holds users",
            "users": existing_users,
            "categories": 0,
            "products": 0,
            "orders": 0,
        }

    rng = random.Random(20260101)
    now = utcnow()

    roles = _seed_roles_and_permissions()
    users = _seed_users(roles)
    _copy_seed_images(_current_upload_folder())

    categories = _seed_categories()
    brands = _seed_brands()
    products = _seed_products(categories, brands, rng)
    _seed_variants_and_inventory(products, rng, users)
    _seed_attributes(products)
    _seed_addresses(users)
    _seed_carts_and_wishlists(users, products)
    orders = _seed_orders(users, products, rng, now)
    _seed_reviews(users, products, orders, rng)
    _seed_coupons(orders, users, now)
    _seed_newsletter()
    _seed_audit_logs(users, now)

    db.session.commit()

    return {
        "seeded": True,
        "reason": "seeded",
        "users": db.session.query(User).count(),
        "categories": db.session.query(Category).count(),
        "products": db.session.query(Product).count(),
        "orders": db.session.query(Order).count(),
    }


def _current_upload_folder() -> str:
    from flask import current_app

    return current_app.config.get("UPLOAD_FOLDER") or str(BACKEND_DIR / "uploads")


# ---------------------------------------------------------------------------
# Seed steps
# ---------------------------------------------------------------------------


def _seed_roles_and_permissions() -> dict[str, Role]:
    permission_rows: dict[str, Permission] = {}
    for name, description in PERMISSIONS.items():
        permission = db.session.execute(
            select(Permission).where(Permission.name == name)
        ).scalar_one_or_none()
        if permission is None:
            permission = Permission(name=name, description=description)
            db.session.add(permission)
        permission_rows[name] = permission
    db.session.flush()

    roles: dict[str, Role] = {}
    for role_name, permission_names in ROLE_PERMISSIONS.items():
        role = db.session.execute(
            select(Role).where(Role.name == role_name)
        ).scalar_one_or_none()
        if role is None:
            role = Role(name=role_name, description=ROLE_DESCRIPTIONS[role_name])
            db.session.add(role)
        role.permissions = [permission_rows[name] for name in permission_names]
        roles[role_name] = role
    db.session.flush()
    return roles


def _seed_users(roles: dict[str, Role]) -> dict[str, User]:
    users: dict[str, User] = {}
    production = _is_production()

    if not production:
        for login in TEST_LOGINS:
            user = User(
                email=login["email"],
                password_hash=hash_password(login["password"]),
                first_name=login["first_name"],
                last_name=login["last_name"],
                phone=login["phone"],
                is_active=True,
            )
            user.roles = [roles[login["role"]]]
            db.session.add(user)
            users[login["email"]] = user

    for email, first_name, last_name, phone in SAMPLE_CUSTOMERS:
        user = User(
            email=email,
            password_hash=hash_password(SAMPLE_CUSTOMER_PASSWORD),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            is_active=True,
        )
        user.roles = [roles["Customer"]]
        db.session.add(user)
        users[email] = user

    db.session.flush()
    return users


def _seed_categories() -> dict[str, Category]:
    categories: dict[str, Category] = {}
    for index, (name, slug, description) in enumerate(CATEGORIES):
        category = Category(
            name=name,
            slug=slug,
            description=description,
            status="active",
            sort_order=index,
            image_url=f"/uploads/category-{slug}.svg",
        )
        db.session.add(category)
        categories[slug] = category
    db.session.flush()
    return categories


def _seed_brands() -> dict[str, Brand]:
    brands: dict[str, Brand] = {}
    for name, description in BRANDS:
        brand = Brand(
            name=name,
            description=description,
            logo_url=f"/uploads/brand-{_slugify(name)}.svg",
        )
        db.session.add(brand)
        brands[name] = brand
    db.session.flush()
    return brands


def _seed_products(
    categories: dict[str, Category],
    brands: dict[str, Brand],
    rng: random.Random,
) -> list[Product]:
    products: list[Product] = []
    for index, (name, category_slug, brand_name, regular, discount, short) in enumerate(
        PRODUCTS
    ):
        slug = _slugify(name)
        discounted = round(regular * (100 - discount) / 100) if discount else None
        product = Product(
            name=name,
            sku=f"SKU-{1000 + index}",
            slug=slug,
            description=(
                f"{short}. Built for everyday use, backed by a two-year warranty "
                "and shipped from our local warehouse."
            ),
            short_description=short,
            brand_id=brands[brand_name].id,
            category_id=categories[category_slug].id,
            regular_price_cents=regular,
            discounted_price_cents=discounted,
            discount_percentage=discount,
            status="published",
            is_featured=index % 4 == 0,
            is_new_arrival=index % 5 == 0,
            rating_average=round(rng.uniform(3.8, 5.0), 1),
            rating_count=rng.randint(3, 40),
        )
        db.session.add(product)
        products.append(product)
    db.session.flush()

    for product in products:
        for position in range(2):
            db.session.add(
                ProductImage(
                    product_id=product.id,
                    url=f"/uploads/product-{product.slug}-{position + 1}.svg",
                    alt_text=f"{product.name} image {position + 1}",
                    sort_order=position,
                )
            )
    db.session.flush()
    return products


def _seed_variants_and_inventory(
    products: list[Product],
    rng: random.Random,
    users: dict[str, User],
) -> None:
    stock_keeper = users.get("inventory@example.com")
    for product in products:
        base_quantity = rng.choice([0, 3, 12, 25, 40, 60])
        inventory = Inventory(
            product_id=product.id,
            variant_id=None,
            quantity=base_quantity,
            reserved_quantity=0,
            low_stock_threshold=5,
        )
        db.session.add(inventory)
        db.session.flush()
        db.session.add(
            InventoryMovement(
                inventory_id=inventory.id,
                quantity_change=base_quantity,
                reason="Initial stock",
                created_by=stock_keeper.id if stock_keeper else None,
            )
        )

        variants = VARIANT_PRODUCTS.get(product.name)
        if not variants:
            continue
        for position, (variant_name, price) in enumerate(variants):
            variant = ProductVariant(
                product_id=product.id,
                sku=f"{product.sku}-V{position + 1}",
                name=variant_name,
                price_cents=price,
                attributes={"option": variant_name},
                status="published",
            )
            db.session.add(variant)
            db.session.flush()
            variant_quantity = rng.choice([0, 4, 10, 18, 30])
            variant_inventory = Inventory(
                product_id=product.id,
                variant_id=variant.id,
                quantity=variant_quantity,
                reserved_quantity=0,
                low_stock_threshold=3,
            )
            db.session.add(variant_inventory)
            db.session.flush()
            db.session.add(
                InventoryMovement(
                    inventory_id=variant_inventory.id,
                    quantity_change=variant_quantity,
                    reason="Initial stock",
                    created_by=stock_keeper.id if stock_keeper else None,
                )
            )
    db.session.flush()


def _seed_attributes(products: list[Product]) -> None:
    attribute = ProductAttribute(name="Size")
    db.session.add(attribute)
    db.session.flush()
    values: dict[str, ProductAttributeValue] = {}
    for value in ("Small", "Medium", "Large"):
        row = ProductAttributeValue(attribute_id=attribute.id, value=value)
        db.session.add(row)
        values[value] = row
    db.session.flush()

    for product in products:
        for variant in product.variants:
            option = (variant.attributes or {}).get("option")
            if option in values:
                db.session.add(
                    ProductVariantValue(
                        variant_id=variant.id,
                        attribute_value_id=values[option].id,
                    )
                )
    db.session.flush()


def _seed_addresses(users: dict[str, User]) -> None:
    for index, user in enumerate(users.values()):
        db.session.add(
            Address(
                user_id=user.id,
                type="shipping",
                line1=f"{100 + index} Market Street",
                line2="Suite 200" if index % 2 == 0 else None,
                city="Portland",
                state="OR",
                postal_code=f"9720{index % 10}",
                country="United States",
                is_default=True,
            )
        )
    db.session.flush()


def _seed_carts_and_wishlists(users: dict[str, User], products: list[Product]) -> None:
    customer = users.get("customer@example.com")
    if customer is None:
        return
    cart = Cart(user_id=customer.id, status="active")
    db.session.add(cart)
    db.session.flush()
    for product in products[:2]:
        db.session.add(
            CartItem(
                cart_id=cart.id,
                product_id=product.id,
                variant_id=None,
                quantity=1,
                unit_price_cents=product.effective_price_cents,
            )
        )

    wishlist = Wishlist(user_id=customer.id)
    db.session.add(wishlist)
    db.session.flush()
    for product in products[2:5]:
        db.session.add(
            WishlistItem(
                wishlist_id=wishlist.id,
                product_id=product.id,
                added_at=utcnow(),
            )
        )
    db.session.flush()


def _seed_orders(
    users: dict[str, User],
    products: list[Product],
    rng: random.Random,
    now: datetime,
) -> list[Order]:
    customers = [user for user in users.values() if user.has_role("Customer")]
    if not customers:
        return []

    orders: list[Order] = []
    for index in range(12):
        customer = customers[index % len(customers)]
        status = ORDER_STATUSES[index % len(ORDER_STATUSES)]
        placed_at = now - timedelta(days=index * 3, hours=index)
        address = db.session.execute(
            select(Address).where(Address.user_id == customer.id)
        ).scalars().first()

        chosen = rng.sample(products, k=min(2, len(products)))
        subtotal = 0
        order = Order(
            order_number=f"ORD-{now.year}-{1000 + index}",
            user_id=customer.id,
            status=status,
            payment_status=(
                "refunded"
                if status == "cancelled"
                else "success"
                if status in {"confirmed", "processing", "shipped", "delivered"}
                else "pending"
            ),
            delivery_method="standard",
            shipping_address_id=address.id if address else None,
            billing_address_id=address.id if address else None,
            placed_at=placed_at,
        )
        db.session.add(order)
        db.session.flush()

        for product in chosen:
            quantity = rng.randint(1, 2)
            unit_price = product.effective_price_cents
            line_total = unit_price * quantity
            subtotal += line_total
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    variant_id=None,
                    product_name=product.name,
                    sku=product.sku,
                    quantity=quantity,
                    unit_price_cents=unit_price,
                    total_cents=line_total,
                )
            )

        shipping = 0 if subtotal >= 10000 else 500
        tax = round(subtotal * 8 / 100)
        order.subtotal_cents = subtotal
        order.discount_cents = 0
        order.shipping_cents = shipping
        order.tax_cents = tax
        order.total_cents = subtotal + shipping + tax

        db.session.add(
            OrderStatusHistory(
                order_id=order.id,
                status="pending",
                changed_by=customer.id,
                changed_at=placed_at,
                note="Order placed",
            )
        )
        if status != "pending":
            db.session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    status=status,
                    changed_by=None,
                    changed_at=placed_at + timedelta(hours=2),
                    note=f"Status set to {status}",
                )
            )

        db.session.add(
            Payment(
                order_id=order.id,
                amount_cents=order.total_cents,
                status=order.payment_status,
                method="card",
                transaction_id=f"mock-{order.order_number}",
            )
        )
        orders.append(order)

    db.session.flush()
    return orders


def _seed_reviews(
    users: dict[str, User],
    products: list[Product],
    orders: list[Order],
    rng: random.Random,
) -> None:
    customers = [user for user in users.values() if user.has_role("Customer")]
    if not customers:
        return
    statuses = ["approved", "approved", "pending", "rejected"]
    for index, product in enumerate(products[:20]):
        customer = customers[index % len(customers)]
        db.session.add(
            Review(
                product_id=product.id,
                user_id=customer.id,
                rating=rng.randint(3, 5),
                comment=REVIEW_COMMENTS[index % len(REVIEW_COMMENTS)],
                is_verified_purchase=bool(orders) and index % 2 == 0,
                status=statuses[index % len(statuses)],
            )
        )
    db.session.flush()


def _seed_coupons(orders: list[Order], users: dict[str, User], now: datetime) -> None:
    customer = users.get("customer@example.com")
    for (
        code,
        coupon_type,
        value,
        min_order,
        max_discount,
        expires_in_days,
        usage_limit,
        per_customer,
        is_active,
    ) in COUPONS:
        coupon = Coupon(
            code=code,
            type=coupon_type,
            value=value,
            min_order_value_cents=min_order,
            max_discount_cents=max_discount,
            expires_at=now + timedelta(days=expires_in_days),
            usage_limit=usage_limit,
            per_customer_limit=per_customer,
            is_active=is_active,
        )
        db.session.add(coupon)
        db.session.flush()
        if code == "WELCOME10" and orders and customer is not None:
            db.session.add(
                CouponRedemption(
                    coupon_id=coupon.id,
                    user_id=customer.id,
                    order_id=orders[0].id,
                    redeemed_at=now,
                )
            )
    db.session.flush()


def _seed_newsletter() -> None:
    for email in ("newsletter.fan@example.com", "deals@example.com"):
        db.session.add(NewsletterSubscriber(email=email))
    db.session.flush()


def _seed_audit_logs(users: dict[str, User], now: datetime) -> None:
    admin = users.get("admin@example.com")
    for index in range(5):
        db.session.add(
            AuditLog(
                user_id=admin.id if admin else None,
                action="product.updated",
                entity_type="product",
                entity_id=index + 1,
                details={"field": "regular_price_cents", "step": index},
            )
        )
    db.session.flush()


__all__ = ["seed_database", "TEST_LOGINS", "PERMISSIONS", "ROLE_PERMISSIONS"]
