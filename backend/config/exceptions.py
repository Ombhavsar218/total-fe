"""Uniform API error envelope: `{success: false, message, errors?}`."""
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def _flatten_errors(detail, prefix=""):
    messages = []
    if isinstance(detail, dict):
        for key, value in detail.items():
            label = f"{prefix}{key}" if not str(key).isdigit() else prefix.rstrip(".")
            messages.extend(_flatten_errors(value, f"{label}: " if label else ""))
    elif isinstance(detail, (list, tuple)):
        for item in detail:
            messages.extend(_flatten_errors(item, prefix))
    else:
        messages.append(f"{prefix}{detail}")
    return messages


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled exception -> let Django log it and return a clean 500.
        if isinstance(exc, APIException):
            return None
        response = Response_error(str(exc) or "Unexpected server error")

    errors = None
    message = "Request failed"
    data = response.data

    if isinstance(data, dict) and isinstance(data.get("detail"), str):
        message = data["detail"]
    elif isinstance(data, (dict, list)):
        messages = _flatten_errors(data)
        errors = data
        if messages:
            message = messages[0]
    elif isinstance(data, str):
        message = data

    response.data = {"success": False, "message": message}
    if errors:
        response.data["errors"] = errors
    return response


def Response_error(message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
    from rest_framework.response import Response

    return Response(
        {"success": False, "message": message},
        status=status_code,
    )


class BusinessError(APIException):
    """A rule violation the caller can fix (e.g. insufficient stock)."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This action violates a business rule."
    default_code = "business_error"
