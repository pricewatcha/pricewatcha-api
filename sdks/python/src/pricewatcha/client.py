"""HTTP client for the Pricewatcha REST API."""

from __future__ import annotations

import time
from typing import Any

import httpx

from pricewatcha.api_error import api_error_from_job_failure, parse_api_error_payload
from pricewatcha.exceptions import PricewatchaAPIError, PricewatchaTimeoutError
from pricewatcha.job_status import is_active_job_status, is_terminal_job_status

DEFAULT_BASE_URL = "https://pricewatcha.com/api/v1"


class Pricewatcha:
    """Lightweight client for the Pricewatcha API v1.

    No API key required for public read endpoints.
    Pass ``api_key="pwk_live_..."`` for alerts and webhooks.

    ``POST /track`` long-polls briefly (~25s server-side). Slow jobs return
    ``status: "running"`` — poll with ``get_job(job_id)``.
    ``track_and_wait()`` loops client-side until terminal state.
    """

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        *,
        api_key: str | None = None,
        timeout: float = 30.0,
        client: httpx.Client | None = None,
    ) -> None:
        if api_key is not None and client is not None:
            raise ValueError("Pass api_key OR a custom client, not both.")

        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._api_key = api_key
        self._owns_client = client is None

        if client is not None:
            self._client = client
        else:
            headers: dict[str, str] = {"User-Agent": "pricewatcha-python/0.1.2"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            self._client = httpx.Client(timeout=timeout, headers=headers)

    def close(self) -> None:
        """Close the underlying HTTP client if owned by this instance."""
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> Pricewatcha:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _url(self, path: str) -> str:
        if not path:
            return self.base_url
        return f"{self.base_url}/{path.lstrip('/')}"

    def _parse_error_response(self, response: httpx.Response) -> tuple[str, dict[str, Any] | None]:
        try:
            payload = response.json()
        except Exception:
            return response.text or f"HTTP {response.status_code}", None
        return parse_api_error_payload(payload)

    def _request(
        self,
        method: str,
        path: str,
        *,
        expected_status: int | tuple[int, ...] = 200,
        **kwargs: Any,
    ) -> dict[str, Any] | list[Any]:
        """Perform an HTTP request and return parsed JSON."""
        if isinstance(expected_status, int):
            expected = (expected_status,)
        else:
            expected = expected_status

        response = self._client.request(method, self._url(path), **kwargs)
        if response.status_code not in expected:
            message, error_body = self._parse_error_response(response)
            raise PricewatchaAPIError(
                message,
                status_code=response.status_code,
                detail=message,
                error_body=error_body,
            )
        if response.status_code == 204 or not response.content:
            return {}
        data = response.json()
        if isinstance(data, dict):
            return data
        if isinstance(data, list):
            return data
        return {"data": data}

    def health(self) -> dict[str, Any]:
        """GET /health — service health check."""
        result = self._request("GET", "/health")
        if not isinstance(result, dict):
            raise TypeError(f"Expected dict response, got {type(result).__name__}")
        return result

    def info(self) -> dict[str, Any]:
        """GET /api/v1 — API discovery and metadata."""
        result = self._request("GET", "")
        if not isinstance(result, dict):
            raise TypeError(f"Expected dict response, got {type(result).__name__}")
        return result

    def track(self, url: str) -> dict[str, Any]:
        """POST /track — bounded server-side long-poll (default ~25s)."""
        result = self._request(
            "POST",
            "/track",
            json={"url": url},
            expected_status=200,
        )
        if not isinstance(result, dict):
            raise TypeError(f"Expected dict response, got {type(result).__name__}")
        return result

    def get_job(self, job_id: str) -> dict[str, Any]:
        """GET /jobs/{jobId} — poll ingestion job status."""
        result = self._request("GET", f"/jobs/{job_id}")
        if not isinstance(result, dict):
            raise TypeError(f"Expected dict response, got {type(result).__name__}")
        return result

    def wait_for_job(
        self,
        job_id: str,
        *,
        timeout: float = 180,
        interval: float = 5,
    ) -> dict[str, Any]:
        """Poll get_job until completed or failed, or raise PricewatchaTimeoutError."""
        deadline = time.monotonic() + timeout
        while True:
            job = self.get_job(job_id)
            status = job.get("status")
            if status == "completed":
                return job
            if status == "failed":
                error_body = api_error_from_job_failure(job.get("error"))
                if error_body:
                    raise PricewatchaAPIError(
                        str(error_body.get("message") or "Tracking job failed"),
                        status_code=error_body.get("http_status"),
                        detail=str(error_body.get("message") or "Tracking job failed"),
                        error_body=error_body,
                    )
                raise PricewatchaAPIError("Tracking job failed")
            if not is_active_job_status(status) or time.monotonic() >= deadline:
                break
            time.sleep(min(interval, max(0, deadline - time.monotonic())))
        raise PricewatchaTimeoutError(
            f"Job {job_id!r} did not complete within {timeout:.0f}s"
        )

    def track_and_wait(
        self,
        url: str,
        *,
        timeout: float = 180,
        interval: float = 5,
    ) -> dict[str, Any]:
        """Client-side loop: track once, then poll get_job until terminal state or timeout."""
        job = self.track(url)
        if is_terminal_job_status(job.get("status")):
            return job
        job_id = job.get("job_id")
        if not job_id:
            raise PricewatchaAPIError("Track response missing job_id")
        return self.wait_for_job(str(job_id), timeout=timeout, interval=interval)

    def get_product(self, product_id: str) -> dict[str, Any]:
        """GET /products/{productId} — structured product intelligence."""
        result = self._request("GET", f"/products/{product_id}")
        if not isinstance(result, dict):
            raise TypeError(f"Expected dict response, got {type(result).__name__}")
        return result

    def get_price_history(self, product_id: str) -> dict[str, Any]:
        """GET /products/{productId}/price-history — historical prices and trend."""
        result = self._request("GET", f"/products/{product_id}/price-history")
        if not isinstance(result, dict):
            raise TypeError(f"Expected dict response, got {type(result).__name__}")
        return result

    def search(self, query: str, *, limit: int | None = None) -> list[dict[str, Any]]:
        """GET /search?q=... — search the public catalog."""
        params: dict[str, str] = {"q": query}
        if limit is not None:
            params["limit"] = str(limit)
        result = self._request("GET", "/search", params=params)
        if not isinstance(result, list):
            raise TypeError(f"Expected list response, got {type(result).__name__}")
        return result
