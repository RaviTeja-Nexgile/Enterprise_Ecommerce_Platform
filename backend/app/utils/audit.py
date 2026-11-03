"""Append-only audit log writes (requirement 20)."""

from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import AuditLog


def write_audit_log(
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    *,
    user_id: int | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Add an audit log row to the session (the caller commits)."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.session.add(entry)
    return entry


__all__ = ["write_audit_log"]
