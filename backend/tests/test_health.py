"""The liveness endpoint and the error envelope."""

from __future__ import annotations


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"


def test_health_is_json(client):
    response = client.get("/api/health")
    assert response.content_type.startswith("application/json")


def test_unknown_route_uses_the_error_envelope(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    body = response.get_json()
    assert "error" in body
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"]


def test_method_not_allowed_uses_the_error_envelope(client):
    response = client.post("/api/health")
    assert response.status_code == 405
    body = response.get_json()
    assert body["error"]["code"] == "method_not_allowed"


def test_foreign_keys_are_enabled(app):
    from sqlalchemy import text

    from app.extensions import db

    with app.app_context():
        value = db.session.execute(text("PRAGMA foreign_keys")).scalar()
    assert value == 1
