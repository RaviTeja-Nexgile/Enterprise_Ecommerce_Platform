"""Shared model helpers: timestamps and JSON columns."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, JSON, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column

from ..extensions import db


def utcnow() -> datetime:
    """Return the current UTC time as a naive datetime (SQLite friendly)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UTCDateTime(TypeDecorator):
    """Store naive UTC datetimes and read them back as naive UTC."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: ANN001, ANN201
        if value is None:
            return None
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):  # noqa: ANN001, ANN201
        return value


class TimestampMixin:
    """``created_at`` and ``updated_at`` on every table, in UTC."""

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class JSONType(TypeDecorator):
    """A JSON column that works on SQLite and other engines."""

    impl = JSON
    cache_ok = True


class BaseModel(db.Model, TimestampMixin):  # type: ignore[name-defined]
    """Abstract base with an integer primary key and timestamps."""

    __abstract__ = True

    id: Mapped[int] = mapped_column(primary_key=True)

    def to_dict(self) -> dict:
        """Return the column values as a plain dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
