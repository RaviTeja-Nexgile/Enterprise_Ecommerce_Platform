"""Flask CLI commands: ``flask seed`` and ``flask db upgrade`` (from Flask-Migrate)."""

from __future__ import annotations

import click
from flask import Flask

from .seed import seed_database


def register_cli(app: Flask) -> None:
    @app.cli.command("seed")
    @click.option("--force", is_flag=True, help="Seed even when the database holds users.")
    def seed_command(force: bool) -> None:
        """Seed the database with sample data and the test logins."""
        result = seed_database(force=force)
        if result["seeded"]:
            click.echo(
                "Seeded: {users} users, {categories} categories, {products} products, "
                "{orders} orders.".format(**result)
            )
        else:
            click.echo(f"Seed skipped: {result['reason']}")

    @app.cli.command("seed-status")
    def seed_status_command() -> None:
        """Print whether the database already holds users."""
        from .extensions import db
        from .models import User

        count = db.session.query(User).count()
        click.echo(f"users={count}")
