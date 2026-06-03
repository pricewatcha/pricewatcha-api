"""Tests for the Pricewatcha Python SDK."""

from __future__ import annotations

import httpx
import pytest

from pricewatcha import (
    Pricewatcha,
    PricewatchaAPIError,
    PricewatchaTimeoutError,
)

COMPLETED_JOB = {
    "job_id": "job_abc",
    "status": "completed",
    "product": {
        "product_id": "prod_x",
        "name": "Phone",
        "shop": "Back Market",
        "product_url": "https://example.com/p/1",
        "currency": "EUR",
        "current_price": 500,
        "status": "active",
        "last_checked_at": "2026-05-22T17:36:58.972027Z",
    },
    "error": None,
}


@pytest.fixture
def client(httpx_mock: pytest.HttpMock) -> Pricewatcha:
    httpx_mock.add_response(
        url="https://example.com/api/v1/health",
        json={"status": "ok", "service": "pricewatcha-api", "version": "v1"},
    )
    return Pricewatcha(base_url="https://example.com/api/v1")


def test_health(client: Pricewatcha, httpx_mock: pytest.HttpMock) -> None:
    data = client.health()
    assert data["status"] == "ok"


def test_track_completed(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        method="POST",
        url="https://example.com/api/v1/track",
        status_code=200,
        json=COMPLETED_JOB,
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    job = client.track("https://www.backmarket.de/de-de/p/example")
    assert job["status"] == "completed"
    assert job["product"]["product_id"] == "prod_x"


def test_track_running_with_hint(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        method="POST",
        url="https://example.com/api/v1/track",
        status_code=200,
        json={
            "job_id": "job_slow",
            "status": "running",
            "product": None,
            "error": None,
            "hint": "Job still running. Poll get_job_status with this job_id.",
        },
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    job = client.track("https://www.amazon.de/dp/example")
    assert job["status"] == "running"
    assert "hint" in job


def test_get_job_failed_scrape_returns_200(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/job_abc",
        json={
            "job_id": "job_abc",
            "status": "failed",
            "product": None,
            "error": {
                "code": "scrape_chain_exhausted",
                "message": "All scraper layers failed.",
                "http_status": None,
                "retry_recommended": False,
                "retry_after_seconds": None,
            },
        },
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    job = client.get_job("job_abc")
    assert job["status"] == "failed"
    assert job["error"]["code"] == "scrape_chain_exhausted"


def test_wait_for_job_completed(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/job_abc",
        json=COMPLETED_JOB,
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    result = client.wait_for_job("job_abc", timeout=10, interval=0.01)
    assert result["status"] == "completed"
    assert result["product"]["product_id"] == "prod_x"


def test_wait_for_job_failed(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/job_abc",
        json={
            "job_id": "job_abc",
            "status": "failed",
            "product": None,
            "error": {
                "code": "invalid_url",
                "message": "Invalid URL",
                "http_status": None,
                "retry_recommended": False,
                "retry_after_seconds": None,
            },
        },
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    with pytest.raises(PricewatchaAPIError, match="Invalid URL"):
        client.wait_for_job("job_abc", timeout=10, interval=0.01)


def test_wait_for_job_timeout(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/job_abc",
        json={"job_id": "job_abc", "status": "running", "product": None, "error": None},
        is_reusable=True,
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    with pytest.raises(PricewatchaTimeoutError):
        client.wait_for_job("job_abc", timeout=0.05, interval=0.01)


def test_track_and_wait_polls_after_running_track(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        method="POST",
        url="https://example.com/api/v1/track",
        status_code=200,
        json={
            "job_id": "job_abc",
            "status": "running",
            "product": None,
            "error": None,
        },
    )
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/job_abc",
        json=COMPLETED_JOB,
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    result = client.track_and_wait("https://example.com/p/1", timeout=10, interval=0.01)
    assert result["status"] == "completed"


def test_api_error_on_404(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/missing",
        status_code=404,
        json={"detail": "Job not found"},
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    with pytest.raises(PricewatchaAPIError, match="Job not found") as exc:
        client.get_job("missing")
    assert exc.value.status_code == 404


def test_structured_api_error_body(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/jobs/job_aaaaaaaaaaaa",
        status_code=404,
        json={
            "error": {
                "code": "job_not_found",
                "message": "Job 'job_aaaaaaaaaaaa' does not exist.",
                "http_status": 404,
                "retry_recommended": False,
                "retry_after_seconds": None,
            }
        },
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    with pytest.raises(PricewatchaAPIError) as exc:
        client.get_job("job_aaaaaaaaaaaa")
    assert exc.value.error_code == "job_not_found"
    assert exc.value.error_body is not None
    assert exc.value.error_body["code"] == "job_not_found"


def test_search_returns_list(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/search?q=iphone",
        json=[{"product_id": "demo_iphone_15_pro", "name": "iPhone", "shop": "Back Market"}],
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    results = client.search("iphone")
    assert len(results) == 1
    assert results[0]["product_id"] == "demo_iphone_15_pro"


def test_api_key_sent_in_header(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/health",
        json={"status": "ok", "service": "pricewatcha-api", "version": "v1"},
    )
    client = Pricewatcha(base_url="https://example.com/api/v1", api_key="pwk_live_test")
    client.health()
    request = httpx_mock.get_request()
    assert request is not None
    assert request.headers["Authorization"] == "Bearer pwk_live_test"


def test_search_with_limit(httpx_mock: pytest.HttpMock) -> None:
    httpx_mock.add_response(
        url="https://example.com/api/v1/search?q=phone&limit=10",
        json=[{"product_id": "prod_x", "name": "Phone", "shop": "Back Market"}],
    )
    client = Pricewatcha(base_url="https://example.com/api/v1")
    results = client.search("phone", limit=10)
    assert len(results) == 1
    assert results[0]["product_id"] == "prod_x"
