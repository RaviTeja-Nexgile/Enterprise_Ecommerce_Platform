"""The signed-in person's profile, address book and reviews."""

from __future__ import annotations

from flask import Blueprint, request

from ...middleware.auth import auth_required
from ...schemas import AddressUpdateSchema, ProfileUpdateSchema, load_or_raise
from ...services import user_service
from ...utils.permissions import require_user
from ...utils.responses import created, no_content, ok

bp = Blueprint("users", __name__, url_prefix="/api/v1/users")


@bp.get("/me")
@auth_required
def get_profile():  # noqa: ANN202
    return ok(user_service.profile(require_user()))


@bp.put("/me")
@auth_required
def update_profile():  # noqa: ANN202
    data = load_or_raise(ProfileUpdateSchema(), request.get_json(silent=True))
    return ok(user_service.update_profile(require_user(), data))


@bp.get("/me/addresses")
@auth_required
def list_addresses():  # noqa: ANN202
    return ok({"data": user_service.list_addresses(require_user())})


@bp.post("/me/addresses")
@auth_required
def create_address():  # noqa: ANN202
    data = load_or_raise(AddressUpdateSchema(), request.get_json(silent=True))
    return created(user_service.create_address(require_user(), data))


@bp.put("/me/addresses/<int:address_id>")
@auth_required
def update_address(address_id: int):  # noqa: ANN202
    data = load_or_raise(AddressUpdateSchema(), request.get_json(silent=True))
    return ok(user_service.update_address(require_user(), address_id, data))


@bp.delete("/me/addresses/<int:address_id>")
@auth_required
def delete_address(address_id: int):  # noqa: ANN202
    user_service.delete_address(require_user(), address_id)
    return no_content()


@bp.get("/me/reviews")
@auth_required
def my_reviews():  # noqa: ANN202
    return ok({"data": user_service.my_reviews(require_user())})


__all__ = ["bp"]
