"""Rate limits on the auth endpoints (design.md "Authentication and authorization")."""

from __future__ import annotations

from ..extensions import limiter

# 10 requests per minute per IP on the auth endpoints.
auth_rate_limit = limiter.limit("10 per minute")

# 5 failed logins per email per 15 minutes is enforced in the auth service.
login_rate_limit = limiter.limit("10 per minute")


__all__ = ["auth_rate_limit", "login_rate_limit"]
