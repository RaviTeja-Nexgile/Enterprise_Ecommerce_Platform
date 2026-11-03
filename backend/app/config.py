"""Application configuration, read from environment variables.

Every setting has a local-development default so the app starts with no
configuration at all. Nothing here points at a cloud service: the database is
a SQLite file, uploads go to a local folder and mail goes to a local Mailpit
inbox.
"""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = _env(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_path(value: str) -> str:
    """Resolve a path relative to the repository root."""
    path = Path(value)
    if not path.is_absolute():
        path = REPO_ROOT / path
    return str(path)


def _default_database_uri() -> str:
    instance_dir = BACKEND_DIR / "instance"
    return f"sqlite:///{(instance_dir / 'ecommerce.db').as_posix()}"


class Config:
    """Base configuration shared by every environment."""

    ENV = _env("FLASK_ENV", "development")
    NODE_ENV = _env("NODE_ENV", "development")
    DEBUG = _env_bool("FLASK_DEBUG", False)
    TESTING = False

    SECRET_KEY = _env("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = _env("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=_env_int("ACCESS_TOKEN_MINUTES", 15))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=_env_int("REFRESH_TOKEN_DAYS", 7))
    JWT_TOKEN_LOCATION = ["headers", "cookies", "json"]
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_SAMESITE = "Strict"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_REFRESH_COOKIE_PATH = "/api/v1/auth"

    SQLALCHEMY_DATABASE_URI = _env("DATABASE_URL", _default_database_uri())
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False, "timeout": 30},
    }

    API_PORT = _env_int("API_PORT", 5001)
    API_HOST = _env("API_HOST", "127.0.0.1")
    FRONTEND_PORT = _env_int("PORT", 4200)
    FRONTEND_ORIGIN = _env("FRONTEND_ORIGIN", f"http://127.0.0.1:{_env_int('PORT', 4200)}")

    MAIL_HOST = _env("MAIL_HOST", "127.0.0.1")
    MAIL_PORT = _env_int("MAIL_PORT", 1025)
    MAIL_SENDER = _env("MAIL_SENDER", "no-reply@example.com")
    MAILPIT_UI_PORT = _env_int("MAILPIT_UI_PORT", 8025)

    UPLOAD_FOLDER = _resolve_path(_env("UPLOAD_FOLDER", "backend/uploads"))
    MAX_UPLOAD_BYTES = _env_int("MAX_UPLOAD_BYTES", 5 * 1024 * 1024)
    MAX_CONTENT_LENGTH = MAX_UPLOAD_BYTES

    RATELIMIT_STORAGE_URI = "memory://"
    RATELIMIT_DEFAULT = "600 per minute"

    JSON_SORT_KEYS = False


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    DEBUG = False
    RATELIMIT_ENABLED = False


class ProductionConfig(Config):
    DEBUG = False


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None = None) -> type[Config]:
    """Return the configuration class for a name, defaulting to FLASK_ENV."""
    key = (name or os.environ.get("FLASK_ENV") or "development").lower()
    return CONFIG_MAP.get(key, DevelopmentConfig)
