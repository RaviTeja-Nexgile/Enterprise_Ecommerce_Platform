"""Auth endpoints: registration, sign-in, refresh, sign-out and password reset."""

from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy import select

from app.extensions import db
from app.models import PasswordResetToken, RefreshToken, User, utcnow
from app.security import verify_password

from helpers import (
    ADMIN_PASSWORD,
    PASSWORD,
    auth_headers,
    login,
    make_user,
    seed_roles,
)

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
REFRESH = "/api/v1/auth/refresh"
LOGOUT = "/api/v1/auth/logout"
FORGOT = "/api/v1/auth/forgot-password"
RESET = "/api/v1/auth/reset-password"
CHANGE = "/api/v1/auth/change-password"


def _register_body(**overrides):
    body = {
        "first_name": "New",
        "last_name": "Shopper",
        "email": "new.shopper@example.com",
        "password": "Strong@12345",
        "phone": "+1 555 0123",
    }
    body.update(overrides)
    return body


def test_register_creates_an_active_customer_and_signs_them_in(app, client):
    with app.app_context():
        seed_roles()
        db.session.commit()

    response = client.post(REGISTER, json=_register_body())
    assert response.status_code == 201
    body = response.get_json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["email"] == "new.shopper@example.com"
    assert "Customer" in body["user"]["roles"]
    assert body["user"]["is_active"] is True

    with app.app_context():
        user = db.session.execute(
            select(User).where(User.email == "new.shopper@example.com")
        ).scalar_one()
        assert user.password_hash != "Strong@12345"
        assert verify_password("Strong@12345", user.password_hash)


def test_register_refuses_a_duplicate_email(app, client):
    with app.app_context():
        seed_roles()
        make_user("taken@example.com")
        db.session.commit()

    response = client.post(REGISTER, json=_register_body(email="taken@example.com"))
    assert response.status_code == 409
    error = response.get_json()["error"]
    assert error["code"] == "email_taken"
    assert error["message"] == "An account with this email already exists"


@pytest.mark.parametrize("password", ["short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"])
def test_register_refuses_a_weak_password(app, client, password):
    with app.app_context():
        seed_roles()
        db.session.commit()

    response = client.post(REGISTER, json=_register_body(password=password))
    assert response.status_code == 400
    error = response.get_json()["error"]
    assert error["code"] == "weak_password"
    assert error["message"] == (
        "Password must be at least 8 characters and include an uppercase letter, "
        "a lowercase letter and a digit"
    )


def test_register_validates_the_required_fields(app, client):
    response = client.post(REGISTER, json={"email": "not-an-email"})
    assert response.status_code == 400
    error = response.get_json()["error"]
    assert error["code"] == "validation_error"
    assert "first_name" in error["fields"]
    assert "password" in error["fields"]


def test_login_issues_both_tokens(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    response = client.post(LOGIN, json={"email": "shopper@example.com", "password": PASSWORD})
    assert response.status_code == 200
    body = response.get_json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["email"] == "shopper@example.com"


def test_login_refuses_a_wrong_password(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    response = client.post(LOGIN, json={"email": "shopper@example.com", "password": "Wrong@12345"})
    assert response.status_code == 401
    error = response.get_json()["error"]
    assert error["code"] == "invalid_credentials"
    assert error["message"] == "Invalid email or password"


def test_login_refuses_an_unknown_email(app, client):
    response = client.post(LOGIN, json={"email": "nobody@example.com", "password": PASSWORD})
    assert response.status_code == 401
    assert response.get_json()["error"]["message"] == "Invalid email or password"


def test_login_refuses_an_inactive_account(app, client):
    with app.app_context():
        seed_roles()
        make_user("inactive@example.com", is_active=False)
        db.session.commit()

    response = client.post(LOGIN, json={"email": "inactive@example.com", "password": PASSWORD})
    assert response.status_code == 403
    error = response.get_json()["error"]
    assert error["code"] == "inactive"
    assert error["message"] == "This account is inactive"


def test_refresh_rotates_the_token(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    tokens = login(client, "shopper@example.com")
    response = client.post(REFRESH, json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 200
    rotated = response.get_json()
    assert rotated["access_token"]
    assert rotated["refresh_token"] != tokens["refresh_token"]

    # The presented token is revoked, so a second use is refused.
    again = client.post(REFRESH, json={"refresh_token": tokens["refresh_token"]})
    assert again.status_code == 401
    assert again.get_json()["error"]["code"] == "session_expired"


def test_refresh_refuses_a_missing_token(app, client):
    response = client.post(REFRESH, json={})
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "session_expired"


def test_logout_revokes_the_refresh_token(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    tokens = login(client, "shopper@example.com")
    response = client.post(LOGOUT, json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 204

    with app.app_context():
        stored = db.session.execute(select(RefreshToken)).scalars().all()
        assert stored
        assert all(token.revoked_at is not None for token in stored)

    refused = client.post(REFRESH, json={"refresh_token": tokens["refresh_token"]})
    assert refused.status_code == 401


def test_forgot_password_answers_the_same_for_any_email(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    known = client.post(FORGOT, json={"email": "shopper@example.com"})
    unknown = client.post(FORGOT, json={"email": "nobody@example.com"})
    assert known.status_code == 200
    assert unknown.status_code == 200
    assert known.get_json()["message"] == "If the email is registered, a reset link has been sent"
    assert unknown.get_json()["message"] == known.get_json()["message"]

    with app.app_context():
        assert db.session.execute(select(PasswordResetToken)).scalars().all()


def test_reset_password_sets_the_new_password_and_marks_the_link_used(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    client.post(FORGOT, json={"email": "shopper@example.com"})
    with app.app_context():
        stored = db.session.execute(select(PasswordResetToken)).scalar_one()
        # The raw token is not stored; use a known one for the test.
        from app.services.auth_service import _hash_reset_token

        raw = "known-reset-token"
        stored.token_hash = _hash_reset_token(raw)
        db.session.commit()

    response = client.post(RESET, json={"token": raw, "password": "Brand@12345"})
    assert response.status_code == 200

    with app.app_context():
        user = db.session.execute(
            select(User).where(User.email == "shopper@example.com")
        ).scalar_one()
        assert verify_password("Brand@12345", user.password_hash)
        token = db.session.execute(select(PasswordResetToken)).scalar_one()
        assert token.used_at is not None

    reused = client.post(RESET, json={"token": raw, "password": "Other@12345"})
    assert reused.status_code == 400
    assert reused.get_json()["error"]["message"] == "This reset link is no longer valid"


def test_reset_password_refuses_an_expired_link(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    client.post(FORGOT, json={"email": "shopper@example.com"})
    with app.app_context():
        from app.services.auth_service import _hash_reset_token

        raw = "expired-token"
        stored = db.session.execute(select(PasswordResetToken)).scalar_one()
        stored.token_hash = _hash_reset_token(raw)
        stored.expires_at = utcnow() - timedelta(minutes=1)
        db.session.commit()

    response = client.post(RESET, json={"token": raw, "password": "Brand@12345"})
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_token"


def test_change_password_requires_the_current_password(app, client):
    with app.app_context():
        seed_roles()
        make_user("shopper@example.com")
        db.session.commit()

    headers = auth_headers(login(client, "shopper@example.com")["access_token"])
    wrong = client.post(
        CHANGE,
        json={"current_password": "Wrong@12345", "new_password": "Brand@12345"},
        headers=headers,
    )
    assert wrong.status_code == 400
    assert wrong.get_json()["error"]["code"] == "wrong_password"

    changed = client.post(
        CHANGE,
        json={"current_password": PASSWORD, "new_password": "Brand@12345"},
        headers=headers,
    )
    assert changed.status_code == 200
    assert changed.get_json()["message"] == "Password changed"

    assert client.post(
        LOGIN, json={"email": "shopper@example.com", "password": "Brand@12345"}
    ).status_code == 200


def test_profile_requires_a_token(app, client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_profile_returns_roles_and_permissions(app, client):
    with app.app_context():
        seed_roles()
        make_user("admin@example.com", role="Super Admin", password=ADMIN_PASSWORD)
        db.session.commit()

    headers = auth_headers(login(client, "admin@example.com", ADMIN_PASSWORD)["access_token"])
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["roles"] == ["Super Admin"]
    assert "products.manage" in body["permissions"]
