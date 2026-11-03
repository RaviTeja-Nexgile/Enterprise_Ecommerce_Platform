"""The single error envelope every API failure is turned into.

Shape::

    {"error": {"code": "<code>", "message": "<message>", "fields": {...}}}

``fields`` is only present for validation errors.
"""

from __future__ import annotations

from typing import Any

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """Base class for errors that carry an HTTP status and an error code."""

    status_code = 400
    code = "bad_request"
    message = "The request could not be processed"

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        fields: dict[str, str] | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message or self.message)
        if message is not None:
            self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        self.fields = fields
        self.payload = payload or {}

    def to_dict(self) -> dict[str, Any]:
        body: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.fields:
            body["fields"] = self.fields
        body.update(self.payload)
        return {"error": body}


class ValidationError(ApiError):
    status_code = 400
    code = "validation_error"
    message = "The request is not valid"


class AuthenticationError(ApiError):
    status_code = 401
    code = "unauthenticated"
    message = "Please sign in to continue"


class PermissionError(ApiError):  # noqa: A001 - mirrors the design's name
    status_code = 403
    code = "forbidden"
    message = "You do not have permission to do this"


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"
    message = "The requested record was not found"


class ConflictError(ApiError):
    status_code = 409
    code = "conflict"
    message = "The record already exists"


class BusinessRuleError(ApiError):
    status_code = 422
    code = "business_rule"
    message = "This action is not allowed"


class RateLimitedError(ApiError):
    status_code = 429
    code = "rate_limited"
    message = "Too many requests. Please try again later"


class ServerError(ApiError):
    status_code = 500
    code = "server_error"
    message = "Something went wrong. Please try again."


_HTTP_CODES = {
    400: ("validation_error", "The request is not valid"),
    401: ("unauthenticated", "Please sign in to continue"),
    403: ("forbidden", "You do not have permission to do this"),
    404: ("not_found", "The requested record was not found"),
    405: ("method_not_allowed", "This method is not allowed for this address"),
    409: ("conflict", "The record already exists"),
    413: ("payload_too_large", "The uploaded file is too large"),
    415: ("unsupported_media_type", "This file type is not supported"),
    422: ("business_rule", "This action is not allowed"),
    429: ("rate_limited", "Too many requests. Please try again later"),
}


def error_response(
    code: str,
    message: str,
    status_code: int,
    fields: dict[str, str] | None = None,
) -> tuple[Any, int]:
    body: dict[str, Any] = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    return jsonify({"error": body}), status_code


def register_error_handlers(app: Flask) -> None:
    """Register the handlers that turn every failure into the envelope."""

    @app.errorhandler(ApiError)
    def _handle_api_error(error: ApiError):  # noqa: ANN202
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(HTTPException)
    def _handle_http_error(error: HTTPException):  # noqa: ANN202
        code, message = _HTTP_CODES.get(
            error.code or 500, ("server_error", "Something went wrong. Please try again.")
        )
        if error.code == 404:
            message = "The requested record was not found"
        return error_response(code, message, error.code or 500)

    @app.errorhandler(Exception)
    def _handle_unexpected(error: Exception):  # noqa: ANN202
        app.logger.exception("Unhandled error: %s", error)
        return error_response(
            "server_error", "Something went wrong. Please try again.", 500
        )
