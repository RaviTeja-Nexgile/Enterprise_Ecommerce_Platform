"""Order, payment and review queries."""

from __future__ import annotations

from sqlalchemy import Select, func, select

from ..extensions import db
from ..models import (
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    Product,
    Review,
    User,
)


def get_order(order_id: int) -> Order | None:
    return db.session.get(Order, order_id)


def get_order_by_number(order_number: str) -> Order | None:
    return db.session.execute(
        select(Order).where(Order.order_number == order_number)
    ).scalar_one_or_none()


def orders_for_user(user_id: int) -> Select:
    return (
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.placed_at.desc(), Order.id.desc())
    )


def count(query: Select) -> int:
    return int(
        db.session.execute(
            query.with_only_columns(func.count(Order.id)).order_by(None)
        ).scalar()
        or 0
    )


def page(query: Select, page: int, per_page: int) -> list[Order]:
    return list(
        db.session.execute(query.offset((page - 1) * per_page).limit(per_page))
        .scalars()
        .all()
    )


def add_order(order: Order) -> Order:
    db.session.add(order)
    return order


def add_order_item(item: OrderItem) -> OrderItem:
    db.session.add(item)
    return item


def add_status_history(entry: OrderStatusHistory) -> OrderStatusHistory:
    db.session.add(entry)
    return entry


def add_payment(payment: Payment) -> Payment:
    db.session.add(payment)
    return payment


def latest_payment(order_id: int) -> Payment | None:
    return db.session.execute(
        select(Payment)
        .where(Payment.order_id == order_id)
        .order_by(Payment.id.desc())
    ).scalars().first()


def next_order_number(year: int) -> str:
    """Generate the next ``ORD-<year>-<n>`` number."""
    prefix = f"ORD-{year}-"
    numbers = db.session.execute(
        select(Order.order_number).where(Order.order_number.like(f"{prefix}%"))
    ).scalars().all()
    highest = 1000
    for number in numbers:
        try:
            highest = max(highest, int(number.rsplit("-", 1)[1]))
        except (IndexError, ValueError):
            continue
    return f"{prefix}{highest + 1}"


def user_has_purchased(user_id: int, product_id: int) -> bool:
    return (
        db.session.execute(
            select(OrderItem.id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.user_id == user_id,
                OrderItem.product_id == product_id,
                Order.status.in_(["confirmed", "processing", "shipped", "delivered"]),
            )
            .limit(1)
        ).scalars().first()
        is not None
    )


def review_for(user_id: int, product_id: int) -> Review | None:
    return db.session.execute(
        select(Review).where(Review.user_id == user_id, Review.product_id == product_id)
    ).scalar_one_or_none()


def add_review(review: Review) -> Review:
    db.session.add(review)
    return review


def reviews_for_user(user_id: int) -> list[Review]:
    return list(
        db.session.execute(
            select(Review).where(Review.user_id == user_id).order_by(Review.created_at.desc())
        ).scalars().all()
    )


def product_by_id(product_id: int) -> Product | None:
    return db.session.get(Product, product_id)


def user_by_id(user_id: int) -> User | None:
    return db.session.get(User, user_id)


__all__ = [
    "get_order",
    "get_order_by_number",
    "orders_for_user",
    "count",
    "page",
    "add_order",
    "add_order_item",
    "add_status_history",
    "add_payment",
    "latest_payment",
    "next_order_number",
    "user_has_purchased",
    "review_for",
    "add_review",
    "reviews_for_user",
    "product_by_id",
    "user_by_id",
]
