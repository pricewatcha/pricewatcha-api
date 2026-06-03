# Pricewatcha Python SDK

Official lightweight client for the [Pricewatcha API](https://pricewatcha.com/en/developers) v1 public preview.

Turn any product URL into structured price intelligence — with async job polling built in.

## Status

**Public preview** — no API key required for read endpoints. Pass `api_key="pwk_live_..."` for alerts and webhooks.

## Install

PyPI publication is planned. For now, install from this repository:

```bash
cd sdks/python
pip install -e ".[dev]"
```

When published:

```bash
pip install pricewatcha
```

*(Not yet available on PyPI.)*

## Quick start

```python
from pricewatcha import Pricewatcha

client = Pricewatcha()  # default: https://pricewatcha.com/api/v1

# Demo product (no scrape)
product = client.get_product("demo_iphone_15_pro")
print(product["name"], product["current_price"], product["currency"])

# Async track + poll
job = client.track("https://www.backmarket.de/de-de/p/your-product-path")
result = client.wait_for_job(job["job_id"])
print(result)

# One-liner: track (long-poll) then client-side poll until terminal state
job = client.track_and_wait("https://www.backmarket.de/de-de/p/your-product-path", timeout=180)
print(job["product"])
```

## API methods

| Method | HTTP | Description |
|--------|------|-------------|
| `health()` | `GET /health` | Health check |
| `info()` | `GET /api/v1` | API discovery |
| `track(url)` | `POST /track` | Bounded server long-poll (~25s); returns shared job status shape |
| `get_job(job_id)` | `GET /jobs/{id}` | Job status |
| `wait_for_job(job_id, …)` | — | Client-side poll until completed/failed (raises on timeout) |
| `track_and_wait(url, …)` | — | Client-side: `track` once, then poll `get_job` until terminal state |
| `get_product(id)` | `GET /products/{id}` | Product intelligence |
| `get_price_history(id)` | `GET /products/{id}/price-history` | History & trend |
| `search(query)` | `GET /search?q=` | Full catalog search (name, URL, shop) |

## Configuration

```python
client = Pricewatcha(
    base_url="https://pricewatcha.com/api/v1",
    timeout=30.0,
)
```

Polling defaults for `wait_for_job` / `track_and_wait`:

- `timeout=180` seconds
- `interval=5` seconds between polls

## Errors

- `PricewatchaError` — base exception
- `PricewatchaAPIError` — HTTP errors, validation failures, failed jobs
- `PricewatchaTimeoutError` — job polling exceeded timeout

## Dependencies

- [httpx](https://www.python-httpx.org/) — only runtime dependency

## Tests

```bash
cd sdks/python
pip install -e ".[dev]"
pytest
```

## Privacy

Product-level price intelligence is public through the API. User accounts, emails, watchlists, and alert settings are never returned. See [`docs/privacy-and-data.md`](../../docs/privacy-and-data.md).

## Disclaimer

Prices are informational snapshots. Merchant prices on the retailer site are always authoritative. Not financial advice.
