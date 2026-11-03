"""Password hashing with Argon2id and the password strength rule."""

from __future__ import annotations

import re

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# Argon2id is the default type of argon2-cffi's PasswordHasher.
_hasher = PasswordHasher()

PASSWORD_RULE_MESSAGE = (
    "Password must be at least 8 characters and include an uppercase letter, "
    "a lowercase letter and a digit"
)


def hash_password(password: str) -> str:
    """Hash a password with Argon2id."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Check a password against its Argon2id hash."""
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def is_strong_password(password: str | None) -> bool:
    """At least 8 characters with an uppercase letter, a lowercase letter and a digit."""
    if not password or len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True


def needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


__all__ = [
    "hash_password",
    "verify_password",
    "is_strong_password",
    "needs_rehash",
    "PASSWORD_RULE_MESSAGE",
]
