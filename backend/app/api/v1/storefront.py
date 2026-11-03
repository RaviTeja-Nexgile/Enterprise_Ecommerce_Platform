"""The storefront home page sections."""

from __future__ import annotations

from flask import Blueprint

from ...services import catalog_service
from ...utils.responses import ok

bp = Blueprint("storefront", __name__, url_prefix="/api/v1/storefront")


@bp.get("/home")
def home():  # noqa: ANN202
    return ok(catalog_service.storefront_home())


__all__ = ["bp"]
