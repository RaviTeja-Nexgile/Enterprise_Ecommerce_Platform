"""WSGI entry point used by ``flask`` and by the dev command."""

from __future__ import annotations

from app import create_app
from app.cli import register_cli

app = create_app()
register_cli(app)
