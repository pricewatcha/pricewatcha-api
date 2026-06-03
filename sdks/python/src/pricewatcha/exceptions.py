"""Exceptions raised by the Pricewatcha Python SDK."""

from __future__ import annotations

from typing import Any


class PricewatchaError(Exception):
    """Base exception for all Pricewatcha SDK errors."""


class PricewatchaAPIError(PricewatchaError):
    """Raised when the API returns an error response or a job fails."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        detail: str | None = None,
        error_code: str | None = None,
        error_body: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail or message
        self.error_code = error_code or (error_body.get("code") if error_body else None)
        self.error_body = error_body


class PricewatchaTimeoutError(PricewatchaError):
    """Raised when polling a job exceeds the configured timeout."""

    def __init__(self, message: str = "Job did not complete within the timeout") -> None:
        super().__init__(message)
