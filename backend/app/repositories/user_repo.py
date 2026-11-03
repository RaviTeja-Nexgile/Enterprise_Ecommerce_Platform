"""User, role, token and address queries."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select

from ..extensions import db
from ..models import Address, PasswordResetToken, RefreshToken, Role, User


def get_by_id(user_id: int) -> User | None:
    return db.session.get(User, user_id)


def get_by_email(email: str) -> User | None:
    return db.session.execute(
        select(User).where(User.email == email.strip().lower())
    ).scalar_one_or_none()


def get_role(name: str) -> Role | None:
    return db.session.execute(select(Role).where(Role.name == name)).scalar_one_or_none()


def add(user: User) -> User:
    db.session.add(user)
    return user


def addresses_for(user_id: int) -> list[Address]:
    return list(
        db.session.execute(
            select(Address).where(Address.user_id == user_id).order_by(Address.id)
        ).scalars().all()
    )


def get_address(user_id: int, address_id: int) -> Address | None:
    return db.session.execute(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    ).scalar_one_or_none()


def add_address(address: Address) -> Address:
    db.session.add(address)
    return address


def clear_default_addresses(user_id: int, address_type: str) -> None:
    for address in addresses_for(user_id):
        if address.type == address_type and address.is_default:
            address.is_default = False


def add_refresh_token(token: RefreshToken) -> RefreshToken:
    db.session.add(token)
    return token


def get_refresh_token(jti: str) -> RefreshToken | None:
    return db.session.execute(
        select(RefreshToken).where(RefreshToken.jti == jti)
    ).scalar_one_or_none()


def revoke_refresh_tokens_for(user_id: int, now: datetime) -> None:
    for token in db.session.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
        )
    ).scalars().all():
        token.revoked_at = now


def add_reset_token(token: PasswordResetToken) -> PasswordResetToken:
    db.session.add(token)
    return token


def get_reset_token(token_hash: str) -> PasswordResetToken | None:
    return db.session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    ).scalar_one_or_none()


__all__ = [
    "get_by_id",
    "get_by_email",
    "get_role",
    "add",
    "addresses_for",
    "get_address",
    "add_address",
    "clear_default_addresses",
    "add_refresh_token",
    "get_refresh_token",
    "revoke_refresh_tokens_for",
    "add_reset_token",
    "get_reset_token",
]
