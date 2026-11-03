"""Shared pytest fixtures: a temporary SQLite database per test module."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from flask_migrate import upgrade

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app  # noqa: E402
from app.cli import register_cli  # noqa: E402
from app.config import TestingConfig  # noqa: E402
from app.extensions import db  # noqa: E402


class TestConfig(TestingConfig):
    """Testing configuration pointed at a temporary SQLite file."""

    SQLALCHEMY_DATABASE_URI = "sqlite://"
    UPLOAD_FOLDER = str(BACKEND_DIR / "uploads")
    RATELIMIT_ENABLED = False
    JWT_SECRET_KEY = "test-jwt-secret"


@pytest.fixture()
def app(tmp_path):
    database_file = tmp_path / "test.db"
    config = type(
        "ModuleTestConfig",
        (TestConfig,),
        {"SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_file.as_posix()}"},
    )
    application = create_app(config)
    register_cli(application)
    with application.app_context():
        upgrade(directory=str(BACKEND_DIR / "app" / "migrations"))
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
