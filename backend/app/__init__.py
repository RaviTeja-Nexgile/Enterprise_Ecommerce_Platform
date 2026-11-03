"""Flask application factory for the E-Commerce Platform API."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from .config import Config, get_config
from .errors import register_error_handlers
from .extensions import cors, db, jwt, limiter, migrate


def create_app(config: type[Config] | str | None = None) -> Flask:
    """Build the Flask app.

    ``config`` may be a configuration class, a configuration name
    (``development``, ``testing``, ``production``) or ``None`` to read
    ``FLASK_ENV`` from the environment.
    """
    app = Flask(__name__, instance_relative_config=True)

    if isinstance(config, str):
        config_class = get_config(config)
    elif config is None:
        config_class = get_config()
    else:
        config_class = config

    app.config.from_object(config_class)
    _ensure_instance_folder(app)
    _ensure_upload_folder(app)
    _configure_logging(app)

    db.init_app(app)
    migrate.init_app(app, db, directory=str(Path(__file__).resolve().parent / "migrations"))
    jwt.init_app(app)
    limiter.init_app(app)
    _configure_cors(app)

    register_error_handlers(app)
    _register_jwt_handlers(app)
    _register_blueprints(app)

    @app.get("/api/health")
    def health():  # noqa: ANN202
        """Liveness probe used by the dev command and the frontend."""
        return jsonify({"status": "ok", "service": "e-commerce-api"})

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename: str):  # noqa: ANN202
        """Serve the local uploads folder (design.md: images at ``/uploads/<file>``)."""
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    return app


def _ensure_instance_folder(app: Flask) -> None:
    instance_path = Path(app.instance_path)
    instance_path.mkdir(parents=True, exist_ok=True)


def _ensure_upload_folder(app: Flask) -> None:
    upload_folder = app.config.get("UPLOAD_FOLDER")
    if upload_folder:
        Path(upload_folder).mkdir(parents=True, exist_ok=True)


def _configure_logging(app: Flask) -> None:
    if app.testing:
        return
    level = logging.DEBUG if app.debug else logging.INFO
    app.logger.setLevel(level)
    if not any(isinstance(h, logging.FileHandler) for h in app.logger.handlers):
        log_dir = Path(app.instance_path) / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(log_dir / "app.log", encoding="utf-8")
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
        )
        app.logger.addHandler(handler)


def _configure_cors(app: Flask) -> None:
    port = app.config.get("FRONTEND_PORT", 4200)
    origins = [
        app.config.get("FRONTEND_ORIGIN") or f"http://127.0.0.1:{port}",
        f"http://127.0.0.1:{port}",
        f"http://localhost:{port}",
    ]
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": sorted(set(origins))}},
        supports_credentials=True,
        expose_headers=["Content-Disposition"],
    )


def _register_jwt_handlers(app: Flask) -> None:
    from flask import jsonify

    @jwt.unauthorized_loader
    def _missing_token(reason: str):  # noqa: ANN202
        return (
            jsonify(
                {"error": {"code": "unauthenticated", "message": "Please sign in to continue"}}
            ),
            401,
        )

    @jwt.invalid_token_loader
    def _invalid_token(reason: str):  # noqa: ANN202
        return (
            jsonify(
                {"error": {"code": "session_expired", "message": "Your session has expired. Please sign in again"}}
            ),
            401,
        )

    @jwt.expired_token_loader
    def _expired_token(header, payload):  # noqa: ANN001, ANN202
        return (
            jsonify(
                {"error": {"code": "session_expired", "message": "Your session has expired. Please sign in again"}}
            ),
            401,
        )

    @jwt.revoked_token_loader
    def _revoked_token(header, payload):  # noqa: ANN001, ANN202
        return (
            jsonify(
                {"error": {"code": "session_expired", "message": "Your session has expired. Please sign in again"}}
            ),
            401,
        )


def _register_blueprints(app: Flask) -> None:
    """Register the blueprints that exist.

    Later tasks add the feature blueprints under ``app/api/v1``; each one is
    registered here when its module is present, so this file does not have to
    change for every new module.
    """
    from .api import register_api_blueprints

    register_api_blueprints(app)


def _load_dotenv() -> None:
    """Load a local ``.env`` file when python-dotenv is installed."""
    try:
        from dotenv import load_dotenv
    except ImportError:  # pragma: no cover - optional dependency
        return
    repo_root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(repo_root / ".env", override=False)
    load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)


_load_dotenv()

__all__ = ["create_app", "db", "migrate", "jwt", "limiter", "cors"]
