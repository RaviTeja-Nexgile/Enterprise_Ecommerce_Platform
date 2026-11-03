"""Profile, address book and the customer's own reviews."""

from __future__ import annotations

from typing import Any

from ..errors import NotFoundError
from ..extensions import db
from ..models import Address, User
from ..repositories import order_repo, user_repo
from .serializers import address_dict, review_dict, user_dict


def profile(user: User) -> dict[str, Any]:
    return user_dict(user)


def update_profile(user: User, data: dict[str, Any]) -> dict[str, Any]:
    """Save the first name, last name and phone (requirement 9.2)."""
    if data.get("first_name"):
        user.first_name = data["first_name"].strip()
    if data.get("last_name"):
        user.last_name = data["last_name"].strip()
    if "phone" in data:
        user.phone = data.get("phone")
    db.session.commit()
    return user_dict(user)


def list_addresses(user: User) -> list[dict[str, Any]]:
    return [address_dict(address) for address in user_repo.addresses_for(user.id)]


def create_address(user: User, data: dict[str, Any]) -> dict[str, Any]:
    address = Address(user_id=user.id, **data)
    if address.is_default:
        user_repo.clear_default_addresses(user.id, address.type)
    user_repo.add_address(address)
    db.session.commit()
    return address_dict(address)


def _own_address(user: User, address_id: int) -> Address:
    address = user_repo.get_address(user.id, address_id)
    if address is None:
        raise NotFoundError("The requested address was not found")
    return address


def update_address(user: User, address_id: int, data: dict[str, Any]) -> dict[str, Any]:
    address = _own_address(user, address_id)
    for field in ("type", "line1", "line2", "city", "state", "postal_code", "country", "is_default"):
        if field in data:
            setattr(address, field, data[field])
    if address.is_default:
        user_repo.clear_default_addresses(user.id, address.type)
        address.is_default = True
    db.session.commit()
    return address_dict(address)


def delete_address(user: User, address_id: int) -> None:
    address = _own_address(user, address_id)
    db.session.delete(address)
    db.session.commit()


def my_reviews(user: User) -> list[dict[str, Any]]:
    """The customer's reviews with their status (requirement 9.9)."""
    return [review_dict(review) for review in order_repo.reviews_for_user(user.id)]


__all__ = [
    "profile",
    "update_profile",
    "list_addresses",
    "create_address",
    "update_address",
    "delete_address",
    "my_reviews",
]
