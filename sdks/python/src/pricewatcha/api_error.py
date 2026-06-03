"""Parse structured API v1 error responses."""

from __future__ import annotations

from typing import Any


def is_api_error_body(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and isinstance(value.get("code"), str)
        and isinstance(value.get("message"), str)
        and (isinstance(value.get("http_status"), int) or value.get("http_status") is None)
        and isinstance(value.get("retry_recommended"), bool)
    )


def parse_api_error_payload(payload: Any) -> tuple[str, dict[str, Any] | None]:
    """Return (message, structured error body or None)."""
    if isinstance(payload, dict):
        err = payload.get("error")
        if is_api_error_body(err):
            return str(err["message"]), err
        detail = payload.get("detail")
        if isinstance(detail, str):
            return detail, None
        if detail is not None:
            return str(detail), None
    return "Request failed", None


def api_error_from_job_failure(job_error: Any) -> dict[str, Any] | None:
    if is_api_error_body(job_error):
        return job_error
    if isinstance(job_error, str) and job_error.strip():
        return {
            "code": "internal_error",
            "message": job_error,
            "http_status": 422,
            "retry_recommended": False,
            "retry_after_seconds": None,
        }
    return None
