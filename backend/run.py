"""Development entry point: ``python run.py`` starts the API on 127.0.0.1:API_PORT."""

from __future__ import annotations

import os

from app import create_app
from app.cli import register_cli

app = create_app()
register_cli(app)


if __name__ == "__main__":
    host = os.environ.get("API_HOST", "127.0.0.1")
    port = int(os.environ.get("API_PORT", "5001"))
    app.run(host=host, port=port, debug=app.debug, use_reloader=False)
