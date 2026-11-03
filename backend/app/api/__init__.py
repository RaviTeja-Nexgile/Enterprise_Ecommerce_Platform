"""Blueprint registration.

Feature modules live under ``app/api/v1/``. Each module exposes a
``bp`` (or ``blueprint``) object; this registry imports the modules that exist
and registers them, so a module added by a later task is picked up without
editing this file.
"""

from __future__ import annotations

import importlib
import logging

from flask import Flask

logger = logging.getLogger(__name__)

# Modules that may exist under app.api.v1. Missing ones are skipped.
V1_MODULES = (
    "auth",
    "users",
    "catalog",
    "cart",
    "wishlist",
    "checkout",
    "orders",
    "payments",
    "reviews",
    "admin",
    "analytics",
    "reports",
    "newsletter",
    "storefront",
)


def register_api_blueprints(app: Flask) -> None:
    from .health import bp as health_bp

    app.register_blueprint(health_bp)

    for name in V1_MODULES:
        module_path = f"app.api.v1.{name}"
        try:
            module = importlib.import_module(module_path)
        except ModuleNotFoundError as error:
            if error.name and error.name.startswith(module_path):
                continue
            raise
        blueprint = getattr(module, "bp", None) or getattr(module, "blueprint", None)
        if blueprint is None:
            logger.warning("Module %s has no bp or blueprint to register", module_path)
            continue
        app.register_blueprint(blueprint)
