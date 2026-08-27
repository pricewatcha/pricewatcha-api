# Pricewatcha API

The **Pricewatcha API** is the **Structured Product Price Intelligence Platform** for developers, automation and AI Agents.

The Pricewatcha API derives from the [pricewatcha.com](https://pricewatcha.com) application. It provides price tracking, alerts and product intelligence beyond the Pricewatcha dashboard. This repository documents the public HTTP API, OpenAPI schema, official SDKs, MCP server and examples. It does not contain the production web application or scrapers.

**Status:** Available · **Version:** `v1` · **Base URL:** `https://pricewatcha.com/api/v1`

**Interactive API keys (browser):** [Developer page](https://pricewatcha.com/en/developers#api-keys)

---

Optional: verify connectivity with `GET https://pricewatcha.com/api/v1/health`. Then pick one of the three paths below.

### Quickstart

#### Path 1: Browse prices (no auth)

Use demo product IDs from the [demo catalog](https://github.com/pricewatcha/pricewatcha-api/tree/main/public-demo) or search the catalog:

```bash
curl -s "https://pricewatcha.com/api/v1/products/demo_iphone_15_pro"
curl -s "https://pricewatcha.com/api/v1/search?q=iphone+15&limit=10"
```

Search is **case-insensitive token AND** (all terms must appear; word order does not matter). Results include the full Pricewatcha catalog, not only URLs submitted via `POST /track`. Use `product_id` from search for product and price-history endpoints (`prod_*` or `demo_*`).

#### Path 2: Track a product and get price history

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/track" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.backmarket.de/de-de/p/example-product"}'

curl -s "https://pricewatcha.com/api/v1/products/{productId}/price-history"
```

`POST /track` returns HTTP 200 with a bounded server-side long-poll (~25s). Use `product_id` from the response for price history. Optional: send `Authorization: Bearer pwk_live_…` for [higher track quotas](#rate-limits).

Fast shops return `status: "completed"` with the full `product` in one call. Slow shops return `status: "running"` with a `job_id`. Poll `GET https://pricewatcha.com/api/v1/jobs/{jobId}` until the job is `completed` or `failed`. More detail: [Async track & poll](#async-workflow).

#### Path 3: Price alert with webhook (API key required)

Create a key on the [Developer page](https://pricewatcha.com/en/developers#api-keys), then:

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_a1b2c3d4e5",
    "notify_on_drop": true,
    "min_threshold_price": 500.00,
    "webhook_url": "https://your-n8n-instance.com/webhook/abc",
    "notify_email": true
  }'
```

For authentication and data boundaries, see [Authentication](#authentication) and [Data boundaries](#data-model).

---

## Authentication

No credential required for catalog [search](search.md), product detail, price history and [async track/poll](async-workflows.md). Track without a key uses [anonymous rate limits](rate-limits.md). Send an API key on `POST /track` to use the higher per-account track quotas.

Protected API v1 endpoints (alerts, webhooks, authenticated track callbacks) use:

```http
Authorization: Bearer pwk_live_…
```

| Credential | Format | When to use |
|------------|--------|-------------|
| **API key** | `pwk_live_…` | **Recommended** for scripts, agents, n8n and server integrations. Create on the [Developer page](https://pricewatcha.com/en/developers#api-keys). |
| **Login session token** | JWT from `POST https://pricewatcha.com/api/auth/login` | Website UI and [headless key bootstrap](#api-keys-headless-bootstrap) only |

Do not use the login session token for alerts, webhooks or other API v1 calls once you have an API key.

See [Access model](#access-model) for which routes are public vs authenticated.

---

### API keys (browser)

Log in on the [Developer page](https://pricewatcha.com/en/developers#api-keys) to create and manage API keys in your browser. The full secret is shown **once** at creation.

For agents without a browser, use [headless key bootstrap](#api-keys-headless-bootstrap) below.

**Using your key** on protected endpoints:

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod_a1b2c3d4e5", "notify_on_drop": true}'
```

---

### Headless key bootstrap (for agents)

If an agent must obtain API credentials without a browser, authenticate once with the same email and password as on the website, create an API key, then use `pwk_live_…` for all further calls. This is not a separate agent login: it is the normal Pricewatcha account login exposed as an HTTP endpoint.

#### How login via API works

`POST https://pricewatcha.com/api/auth/login` accepts JSON `email` and `password` and returns a short-lived `access_token` (login session token). The [Developer page](https://pricewatcha.com/en/developers) login modal calls the same endpoint; in a script or agent you call it directly with `curl` or your HTTP client.

- You need an existing account (register on the site or via `POST https://pricewatcha.com/api/auth/register`).
- The email must be verified: otherwise the API returns **403**.
- Wrong credentials return **401**.
- Use `access_token` only to create keys; for alerts and webhooks use the `pwk_live_…` key from step 2.

**Step 1: Login**

```bash
curl -s -X POST "https://pricewatcha.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "YOUR_PASSWORD"}'
```

**Response** (HTTP 200), `AuthResponse`:

- `access_token` (string): login session token (JWT)
- `token_type` (string): always `"bearer"`
- `user` (object): `id` (string, UUID), `email` (string), `email_verified` (boolean)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "you@example.com",
    "email_verified": true
  }
}
```

Send the token as `Authorization: Bearer <access_token>` in step 2. Session tokens expire; do not store them as the long-term credential for an agent.

**Step 2: Create API key**

```bash
curl -s -X POST "https://pricewatcha.com/api/keys" \
  -H "Authorization: Bearer ACCESS_TOKEN_FROM_STEP_1" \
  -H "Content-Type: application/json" \
  -d '{"name": "agent bootstrap"}'
```

**Response** (HTTP 200), `CreateApiKeyResponse`:

- `id` (integer): key ID
- `name` (string): label from the request
- `key_prefix` (string): first 12 characters of the key (for display)
- `key` (string): full secret; returned only on create, not on list
- `is_active` (boolean)
- `created_at` (string, ISO 8601 datetime)
- `last_used_at` (string or `null`)
- `revoked_at` (string or `null`)

```json
{
  "id": 42,
  "name": "agent bootstrap",
  "key_prefix": "pwk_live_ab",
  "key": "pwk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "is_active": true,
  "created_at": "2026-05-27T14:30:00.123456",
  "last_used_at": null,
  "revoked_at": null
}
```

Store `key` securely. Use it on alerts, webhooks and other protected API v1 endpoints, not the session token from step 1.

---

### API endpoints (overview)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | - | Health check |
| `GET` | `/api/v1` | - | Discovery and disclaimer |
| `POST` | `/api/v1/track` | - | URL ingestion (long-poll) |
| `GET` | `/api/v1/jobs/{jobId}` | - | Job status |
| `GET` | `/api/v1/products/{productId}` | - | Product intelligence |
| `GET` | `/api/v1/products/{productId}/price-history` | - | History and trend |
| `GET` | `/api/v1/search?q=` | - | Keyword search (`limit` max 200) |
| `GET` | `/api/v1/openapi.json` | - | Live OpenAPI 3.1 |
| `POST` | `/api/auth/login` | - | Login (short-lived session token) |
| `POST` | `/api/keys` | Session token | Create API key |
| `GET` / `DELETE` | `/api/keys` … | Session token or key | List / revoke keys |
| `*` | `/api/v1/alerts` … | API key | Price alerts |
| `*` | `/api/v1/webhooks` … | API key | Webhook subscriptions |

Machine-readable contract: [openapi/openapi.yaml](openapi/openapi.yaml) · Live: `GET https://pricewatcha.com/api/v1/openapi.json`

---

## Rate limits

### Current limits (indicative)

The following limits apply and may change without notice.

| Class | Endpoint | Anonymous | Authenticated (API key) |
|--------|----------|-----------|-------------------------|
| Track (concurrent) | `POST /track` | ~2 in-flight jobs | ~4 in-flight jobs |
| Track (burst) | `POST /track` | ~10 jobs / 60s | ~20 jobs / 60s |
| Track (hourly) | `POST /track` | ~40 jobs / hour | ~120 jobs / hour |
| Track (daily) | `POST /track` | ~80 jobs / day | ~400 jobs / day |
| Job poll | `GET /jobs/{id}` | ~40 req/min per client | same |
| Search (burst) | `GET /search` | ~20 req / 60s | same |
| Search (hourly) | `GET /search` | ~60 req / hour | same |
| Search (daily) | `GET /search` | ~200 req / day | same |
| Read (burst) | `/products`, `/price-history` | ~60–120 req/min per client | same |
| Read (hourly) | `/products`, `/price-history` | ~180 req / hour | same |
| Read (daily) | `/products`, `/price-history` | ~600 req / day | same |
| Health | `/health` and `/` | Unlimited | Unlimited |

Send `Authorization: Bearer pwk_live_…` on `POST /track` to use the authenticated tier. Track remains available without a key at the anonymous limits.

> **Client identity:** anonymous limits are keyed by client IP. Behind Cloudflare the API prefers `CF-Connecting-IP` over `X-Forwarded-For` so edge proxy IPs are not treated as distinct clients. The hosted MCP server forwards a stable `X-Pricewatcha-Client-Id` (OAuth token hash, else connecting-IP hash) with a shared proxy secret so MCP callers are not all bucketed under one egress IP. Authenticated track quotas are keyed by account (`owner_id`), not IP.

> Monitor `X-RateLimit-Remaining` and honor `429` with exponential backoff. `X-RateLimit-Policy` names which window the headers refer to (`track`, `track_hourly`, `track_daily`, `track_concurrent`, `job_read`, `search`, `search_hourly`, `search_daily`, `read`, `read_hourly`, or `read_daily`).

**Track quotas are counted from persisted jobs** (`api_track_jobs` by client key or account), so they apply across multiple app instances. A long-poll that holds the HTTP connection for ~25s still counts as **one** track job when created — sequential tracks spaced farther apart than 60s will not trip the burst window, but hourly/daily and concurrent caps still apply.

Agents should prefer: start track → poll `GET /jobs/{id}` with backoff (not every 1–2s) → read product/history once complete. Retrying `POST /track` with the same URL while that job is still `queued`/`processing` reuses the existing job and does not consume another concurrent slot. Jobs left `queued`/`processing` longer than the scrape timeout (default 600s) are failed so slots cannot leak across deploys.

Search and product-read quotas are in-memory per app instance (not shared across Railway replicas the way track jobs are). Polling the same catalog queries on a short interval will still trip the hourly/daily search windows.

Exact numbers may change without notice (env overrides: `API_V1_TRACK_*`, `API_V1_TRACK_AUTH_*`, `API_V1_JOB_READ_*`, `API_V1_READ_*`, `API_V1_SEARCH_*`).

### Headers

When rate limiting is active, responses may include:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in the window |
| `X-RateLimit-Remaining` | Requests left in the window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `X-RateLimit-Policy` | Which window the headers describe |

### HTTP 429

When limited, the API returns `429 Too Many Requests` with a JSON body:

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded (track daily). Try again later.",
    "http_status": 429,
    "retry_recommended": true,
    "retry_after_seconds": 3600
  }
}
```

**Agent guidance:** honor `429`, wait until `retry_after_seconds` / `X-RateLimit-Reset`, and reduce poll frequency on job status endpoints. Prefer spreading tracks over time rather than bursting near the hourly/daily caps. Anonymous `429` responses mention that an API key raises track quotas.

Operators can receive an email when hourly/daily/concurrent track limits or hourly/daily search and product-read limits trip (cooldown per client; see `API_V1_RATE_LIMIT_ALERT_*`).

### Abuse and IP restrictions

Sustained abuse of anonymous daily quotas (track, search, or product reads — for example exhausting the daily limit on several days from the same IP) may trigger an **in-app restriction**, not only `429`.

1. **Notice (grace period).** API calls still succeed. Responses include `X-Pricewatcha-Restriction: notice` and `X-Pricewatcha-Restriction-Message` with the pending-block warning. Rate limits still apply.
2. **Block.** If there is no reply, the IP is blocked. Further calls return HTTP `403` with `error.code` `access_restricted`.

Email **[info@pricewatcha.com](mailto:info@pricewatcha.com)** to discuss terms or restore access. Do not retry until access is restored. Retries will not lift the restriction.

---

## Async track and poll

`POST /api/v1/track` submits a product URL and waits up to **~25 seconds** (long-poll). No API key is required. Send `Authorization: Bearer pwk_live_…` to use [higher per-account track quotas](rate-limits.md).

- Fast shops: `status: "completed"` with full `product` in the same response
- Slow shops: `status: "running"` + `job_id`: poll `GET /api/v1/jobs/{jobId}` until `completed` or `failed`
- Repeat `POST /track` for the same URL while a job is in flight returns that job instead of starting another (and instead of a concurrent 429)

Jobs are retained for **72 hours**. After expiry, `GET /jobs/{jobId}` returns **404**: use `GET /products/{productId}` instead.

### Typical flows

#### Fast shop (one call)

```
POST /api/v1/track → { "status": "completed", "product": { ... } }
```

#### Slow shop

```
POST /api/v1/track → { "status": "running", "job_id": "job_xxx", "hint": "..." }
GET  /api/v1/jobs/{jobId} → poll until terminal state
GET  /api/v1/products/{productId} and .../price-history
```

### Track a product

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/track" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.backmarket.de/de-de/p/example-product"}'
```

Response (`200`) when the scrape completes within the long-poll window:

```json
{
  "job_id": "job_xxxxxxxx",
  "status": "completed",
  "product": {
    "product_id": "prod_xxxxxxxx",
    "name": "Example product",
    "shop": "Back Market",
    "current_price": 563,
    "currency": "EUR"
  },
  "error": null
}
```

Response (`200`) when still running after the long-poll timeout:

```json
{
  "job_id": "job_xxxxxxxx",
  "status": "running",
  "product": null,
  "error": null,
  "hint": "Job still running. Call the get_job_status tool with this job_id to poll for the result."
}
```

### Poll job status

```bash
curl -s "https://pricewatcha.com/api/v1/jobs/job_xxxxxxxx"
```

#### Completed response

```json
{
  "job_id": "job_xxxxxxxx",
  "status": "completed",
  "product": {
    "product_id": "prod_xxxxxxxx",
    "name": "Example product",
    "shop": "Back Market",
    "current_price": 563,
    "currency": "EUR"
  }
}
```

### Job states

| Status | Meaning |
|--------|---------|
| `queued` | Job accepted, waiting to start |
| `running` | Ingestion in progress |
| `completed` | Product intelligence in `product` |
| `failed` | Scrape failed: read structured `error` (HTTP 200 job lookup) |

### Recommended client flow

1. `POST /track` with `{ "url": "..." }` → **200**
2. If `running` or `queued`, poll `GET /jobs/{jobId}` every 2–5 seconds
3. On `completed`, read `product` from the job or `GET /products/{productId}`
4. On `failed`, surface `error.code`; backoff before retrying

#### Job lookup vs. scrape failure

When polling `GET /jobs/{jobId}`, interpret HTTP status and body together:

| Response | Meaning | What to do |
|----------|---------|------------|
| **HTTP 404** | No job with this `job_id` (wrong ID or job expired after 72h) | Stop polling; start a new `POST /track` if you still need the product |
| **HTTP 200** with `"status": "failed"` | Job exists, but scraping failed | Read `error.code` in the JSON body (e.g. `scrape_target_not_found`) |

A **404** is a lookup problem. A **200** with `failed` is a completed job whose scrape did not succeed.

### Track job webhooks (push)

Authenticated clients can receive a push when a track job finishes: use `callback_url` (one-off) or `webhook_id` (existing subscription). Mutually exclusive. Same rate limits as anonymous `POST /track`.

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/track" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.backmarket.de/de-de/p/example-product",
    "callback_url": "https://n8n.example.com/webhook/track-done"
  }'
```

With `callback_url`, the track response may include `callback_secret` (`whsec_…`) once: same signing as subscription webhooks.

When the job finishes, Pricewatcha sends a webhook with event type `track_job_completed` or `track_job_failed` (same payload shape as other webhooks). If you do not use push delivery, you can still wait on `POST /track` (long-poll) or poll `GET /jobs/{jobId}` until the job reaches a terminal state.

> **Note:** Anonymous `POST /track` with `callback_url` or `webhook_id` returns `400 auth_required_for_callback`. MCP tools use track → poll (no `callback_url` in v1).



### SDK convenience

Official Python and TypeScript SDKs may provide `track_and_wait()` / `trackAndWait()`: a helper that calls `POST /track`, then polls `GET /jobs/{jobId}` until the job is `completed` or `failed` and returns the result. The HTTP API stays async-first; the helper only saves you from writing the poll loop yourself. See [SDKs](#sdks).

### Deduplication

Repeated `POST /track` for the same URL may return `completed` quickly with existing intelligence.

### Timeouts

Long-poll default is ~25 seconds. For slow shops, poll `GET /jobs/{jobId}` instead of extending the track timeout.

---

## Search

Keyword search is **case-insensitive**. The query is split into tokens; a product matches when **every** token appears in the normalized product name, URL, platform/shop or related fields. Word order does not matter, and punctuation such as hyphens and slashes is treated as whitespace (`Darth-Vader` matches `Darth Vader`). Results cover the **full Pricewatcha catalog**, not only URLs submitted via `POST /track`.

Exact contiguous phrases still rank above other token matches when both match.

### Endpoint

`GET https://pricewatcha.com/api/v1/search?q=…&limit=…`

Optional `limit`: default **50**, maximum **200**. Applied after exclude-term filtering.

Search is rate-limited separately from product reads (~20 requests / 60s, ~60 / hour, ~200 / day per client). Honor HTTP `429` and `X-RateLimit-Policy`; see [Rate limits](rate-limits.md).

`q` supports Google-style minus-prefixed exclude terms. `q=iPhone+15+-cover+-case` returns products matching both "iPhone" and "15" that do **not** contain "cover" or "case" in the searchable fields (case-insensitive). A lone `-` is ignored.

```bash
curl -s "https://pricewatcha.com/api/v1/search?q=iphone&limit=10"
curl -s "https://pricewatcha.com/api/v1/search?q=iPhone+15+-cover+-case"
curl -s "https://pricewatcha.com/api/v1/search?q=Darth+Vader+DX27"
```

### Example response

```json
[
  {
    "product_id": "demo_iphone_15_pro",
    "name": "Apple iPhone 15 Pro 128GB (Refurbished)",
    "shop": "Back Market",
    "product_url": "https://www.backmarket.de/de-de/p/example-iphone-15-pro",
    "current_price": 563,
    "currency": "EUR",
    "status": "active",
    "preview": true,
    "google_product_category_id": null,
    "google_product_category_name": null
  },
  {
    "product_id": "prod_a1b2c3d4e5",
    "name": "iPhone 15 Pro",
    "shop": "Swappie",
    "product_url": "https://swappie.com/de/p/iphone-15-pro/",
    "current_price": 505,
    "currency": "EUR",
    "status": "active",
    "google_product_category_id": null,
    "google_product_category_name": null
  }
]
```

Use `product_url` for direct linking without an extra `GET /products/{id}` call.

Results always include `google_product_category_id` and `google_product_category_name` (`null` when unset). You do not need an extra query parameter.

### Demo catalog (no scrape required)

Preview demo products are always available for integration testing:

```bash
curl -s "https://pricewatcha.com/api/v1/products/demo_iphone_15_pro"
curl -s "https://pricewatcha.com/api/v1/products/demo_iphone_15_pro/price-history"
curl -s "https://pricewatcha.com/api/v1/search?q=iphone+15+pro"
```

See the [demo catalog](https://github.com/pricewatcha/pricewatcha-api/tree/main/public-demo) on GitHub.

---

## Data boundaries

Catalog **price intelligence** (current price, history, product metadata) is available without authentication. **User-specific data** (accounts, emails, alert settings, private watchlists) is never exposed through the public API.

### Readable fields

- `product_id`, name, shop/platform, product URL
- Current price, currency, last checked, status
- Price history, historical low/high, average, trend
- `data_source` and `data_source_label` when price data comes directly from a merchant feed (`merchant_feed` → `"Direct merchant data"`)
- `google_product_category_id` and `google_product_category_name` on product detail and search (null when unset). Search does not require an extra query parameter.
- Demo entries may include `"preview": true`

Search, product detail and price history return the same fields whether the product was added via dashboard, API, MCP or demo data.

### Product IDs

| Prefix | Meaning |
|--------|---------|
| `demo_*` | Static preview samples (e.g. `demo_iphone_15_pro`) |
| `prod_*` | Opaque stable ID per catalog product (one per URL entity) |

Use `product_id` from search or a completed track job for `GET /products/{productId}` and `.../price-history`.

### Webhook payloads

Deliveries include **product-level event data** only (prices, product IDs, event type), not user emails or account details. Verify authenticity with the subscription signing secret (`whsec_...`); see [Webhooks](webhooks.md#webhook-signing).

### Compliance

If you build on this API, disclose to your users that prices are informational and that merchant sites are authoritative.

---

## Errors and error codes

Non-success responses use a structured `error` object. Inspect **`error.code`**: do not parse free-text `message` values.

### Shape

```json
{
  "error": {
    "code": "invalid_url_type",
    "message": "url looks like a search or listing page (query parameter 'k')",
    "http_status": 400,
    "retry_recommended": false,
    "retry_after_seconds": null
  }
}
```

| Field | Description |
|-------|-------------|
| `code` | Stable machine identifier |
| `message` | Human-readable detail (not for branching logic) |
| `http_status` | HTTP status echoed in the body |
| `retry_recommended` | Whether a retry may help |
| `retry_after_seconds` | Hint when rate-limited (may be `null`) |

### Public / track / catalog codes

| Code | Typical HTTP | When |
|------|--------------|------|
| `invalid_input_format` | 400 | Malformed JSON or parameters |
| `invalid_url_type` | 400 | URL is a search/listing page, unsupported shop, etc. |
| `job_not_found` | 404 | Unknown or expired `job_id` (jobs expire after 72h) |
| `product_not_found` | 404 | Unknown `product_id` |
| `scrape_target_not_found` | 404 | Product page not found on the shop |
| `scrape_chain_exhausted` | 502 | All scraper strategies failed |
| `scrape_timeout` | 200 (job failed) | Track job exceeded the scrape timeout, or a queued/processing job was reaped after a worker loss |
| `rate_limited` | 429 | Track/search/read quota exceeded: honor `retry_after_seconds`. Anonymous track is per client IP; API keys use higher per-account track quotas. Search and product-read quotas are the same with or without a key. |
| `access_restricted` | 403 | The client IP is blocked after an abuse notice. Email [info@pricewatcha.com](mailto:info@pricewatcha.com). Do not retry until access is restored. During the earlier grace period the API still works and sends `X-Pricewatcha-Restriction: notice`. |
| `internal_error` | 500 | Unexpected server error |

### Authentication & API keys

| Code | Typical HTTP | When |
|------|--------------|------|
| `unauthenticated` | 401 | Missing or invalid bearer token |
| `invalid_session_token` | 401 | Expired or invalid login session (not an API key) |
| `invalid_api_key` | 401 | Revoked or unknown API key |
| `api_key_limit_reached` | 403 | Account key quota exceeded |
| `api_key_not_found` | 404 | Key id not found |

### Alerts & webhooks

| Code | Typical HTTP | When |
|------|--------------|------|
| `alert_already_exists` | 409 | One alert per user per product: use `PATCH` |
| `alert_not_found` | 404 | Unknown `alert_id` |
| `webhook_not_found` | 404 | Unknown subscription |
| `webhook_limit_reached` | 403 | Subscription quota exceeded |
| `auth_required_for_callback` | 400 | `callback_url` / `webhook_id` on `POST /track` without auth |
| `callback_conflict` | 400 | Both `callback_url` and `webhook_id` set |
| `invalid_callback_url` | 400 | Callback URL not HTTPS or blocked target |

### Agent guidance

- Branch on `error.code`, not `message`.
- When `retry_recommended` is `true`, use exponential backoff and respect `retry_after_seconds`.
- HTTP **200** on `GET /jobs/{jobId}` with `status: "failed"` is a **job failure**, not a transport error.

Full schemas: live `GET https://pricewatcha.com/api/v1/openapi.json` and the [OpenAPI spec](https://github.com/pricewatcha/pricewatcha-api/blob/main/openapi/openapi.yaml) on GitHub.

---

## Price Alert API

Create price alerts that send **email notifications** and/or fire **webhooks** when a price moves.

Each tracked product has **one alert record per user**. Combine any of:

- `notify_on_drop`: notify on any price drop (no threshold required)
- `notify_on_rise`: notify on any price increase (no threshold required)
- `min_threshold_price`: notify when price drops to or below this value
- `max_threshold_price`: notify when price rises to or above this value

At least one of those four settings is required.

All endpoints require an API key in `Authorization: Bearer …`. Full schemas: `GET https://pricewatcha.com/api/v1/openapi.json` (tag `alerts`).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/alerts` | List your alerts. Optional: `?product_id=prod_…` |
| `POST` | `/api/v1/alerts` | Create alert. `409 alert_already_exists` if one exists: use `PATCH` |
| `GET` | `/api/v1/alerts/{alertId}` | Get one alert |
| `PATCH` | `/api/v1/alerts/{alertId}` | Update thresholds, directional flags, webhook URL, email, name, `is_active` |
| `DELETE` | `/api/v1/alerts/{alertId}` | Delete (`204`) |

### Create a directional alert (no threshold)

Notify whenever the price goes down — same as the dashboard **Cheaper** toggle:

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_a1b2c3d4e5",
    "notify_on_drop": true,
    "notify_email": true,
    "name": "Any drop"
  }'
```

### Create a threshold alert

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_a1b2c3d4e5",
    "min_threshold_price": 499.00,
    "max_threshold_price": 599.00,
    "webhook_url": "https://n8n.example.com/webhook/alert",
    "notify_email": true,
    "name": "Deal range"
  }'
```

Example response (`201`):

```json
{
  "alert_id": 76,
  "product_id": "prod_a1b2c3d4e5",
  "min_threshold_price": 499.00,
  "max_threshold_price": 599.00,
  "notify_on_drop": false,
  "notify_on_rise": false,
  "currency": "EUR",
  "webhook_url": "https://n8n.example.com/webhook/alert",
  "notify_email": true,
  "name": "Deal range",
  "is_active": true,
  "created_at": "2026-05-24T12:00:00Z",
  "updated_at": "2026-05-24T12:00:00Z",
  "last_triggered_at": null
}
```

### List and get

```bash
curl -s "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"

curl -s "https://pricewatcha.com/api/v1/alerts?product_id=prod_a1b2c3d4e5" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"

curl -s "https://pricewatcha.com/api/v1/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

### Update and delete

```bash
curl -s -X PATCH "https://pricewatcha.com/api/v1/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"notify_on_drop": true, "min_threshold_price": null}'

curl -s -X PATCH "https://pricewatcha.com/api/v1/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'

curl -s -X DELETE "https://pricewatcha.com/api/v1/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

---

## Webhooks

Webhooks push **signed HTTP POST** requests when prices change, alert thresholds are crossed or authenticated track jobs complete.

Subscribe to event types **globally** or for a single `product_id`. Each event type is delivered as its own request.

| Scope | Behaviour |
|-------|-----------|
| **Global** (`product_id` omitted) | Price events for products **you** track (watchlist) or for which you have an **active price alert**. Not the full catalog. |
| **Scoped** (`product_id` set) | Price events for that product only. |
| **Test** (`POST /webhooks/{id}/test`) | Sends a `webhook_test` payload to verify your endpoint; no product scope. |

Catalog-wide price streaming is not supported. Use the test endpoint to verify delivery, then track products or create alerts for the events you care about.

Manage subscriptions via `POST https://pricewatcha.com/api/v1/webhooks`. Full schemas: `GET https://pricewatcha.com/api/v1/openapi.json` (tags `webhooks`, `alerts`).

> **Note:** Target URLs must use **HTTPS** and must not resolve to private or internal IP ranges.



### Event types

| Event type | Trigger |
|------------|---------|
| `price_changed` | Price moved by more than €0.01 |
| `price_dropped` | Price decreased by more than €0.01 |
| `price_increased` | Price increased by more than €0.01 |
| `new_historical_low` | New price strictly lower than any previous observation |
| `price_alert_triggered` | User alert fired (min/max threshold or directional drop/rise) |
| `track_job_completed` | Authenticated `POST /track` finished successfully |
| `track_job_failed` | Authenticated `POST /track` failed |
| `webhook_test` | Only from `POST /api/v1/webhooks/{webhook_id}/test` |

### Payload format

#### `price_dropped`

```json
{
  "event_id": "evt_a1b2c3d4e5",
  "event_type": "price_dropped",
  "occurred_at": "2026-05-24T14:00:00Z",
  "product": {
    "product_id": "prod_a1b2c3d4e5",
    "name": "Apple iPhone 15 Pro 128GB (Refurbished)",
    "shop": "Back Market",
    "product_url": "https://www.backmarket.de/...",
    "currency": "EUR"
  },
  "price": {
    "old_price": 599.00,
    "new_price": 536.00,
    "historical_low": 536.00,
    "historical_high": 729.00,
    "average_price": 612.50
  },
  "metadata": {
    "source": "pricewatcha",
    "api_version": "v1"
  }
}
```

#### `price_alert_triggered`

Includes the same `product` and `price` blocks plus an `alert` object:

```json
{
  "event_id": "evt_b2c3d4e5f6",
  "event_type": "price_alert_triggered",
  "occurred_at": "2026-05-24T14:00:00Z",
  "alert": {
    "alert_id": "76",
    "min_threshold_price": 549.00,
    "max_threshold_price": 599.00,
    "threshold_reached": "min",
    "name": "Under €550"
  },
  "metadata": {
    "source": "pricewatcha",
    "api_version": "v1"
  }
}
```

### Signing and verification

Every delivery includes:

- `X-Pricewatcha-Event-Id`
- `X-Pricewatcha-Event-Type`
- `X-Pricewatcha-Timestamp` (Unix seconds)
- `X-Pricewatcha-Signature` (`sha256=<hex>`)

Signed string: `"{timestamp}.{raw_body}"` with HMAC-SHA256 and your webhook secret (`whsec_…`, shown once at subscription creation).

> **Warning:** **The webhook secret is shown only once.** Store it securely: only `secret_prefix` is shown afterward.



#### Python

```python
import hmac
import hashlib

def verify_pricewatcha_webhook(secret: str, timestamp: str, raw_body: bytes, signature: str) -> bool:
    expected = hmac.new(
        secret.encode("utf-8"),
        f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature or "")
```

#### JavaScript (Node.js)

```javascript
import crypto from "node:crypto";

function verifyPricewatchaWebhook(secret, timestamp, rawBody, signature) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedHeader = `sha256=${expected}`;
  return crypto.timingSafeEqual(
    Buffer.from(expectedHeader),
    Buffer.from(signature || "")
  );
}
```

### Delivery and retry

Failed deliveries retry up to **5** times: 1 min → 5 min → 30 min → 2 h → 12 h.

After **10** consecutive failures the subscription is auto-disabled.

#### Delivery logs

```bash
curl -s "https://pricewatcha.com/api/v1/webhooks/{webhook_id}/deliveries" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

### Examples

#### Create a subscription

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/webhooks" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://n8n.example.com/webhook/abc123",
    "event_types": ["price_dropped", "new_historical_low"],
    "product_id": "prod_a1b2c3d4e5"
  }'
```

#### Send a test webhook

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/webhooks/42/test" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

---

## AI Agents & MCP

Pricewatcha exposes a **remote MCP endpoint**: no local installation required. Connect your AI client with the URL below. Available tools include catalog reads (`get_api_status`, `search_products`, `track_product`, `get_job_status`, `get_product`, `get_price_history`) and price alerts (`create_price_alert`, `list_price_alerts`, `get_price_alert`, `update_price_alert`, `delete_price_alert`). Alert tools require a Pricewatcha API key and can notify on any drop or rise without a numeric threshold.

```
https://mcp.pricewatcha.com
```

For step-by-step setup, see [Claude](#integration-claude), [ChatGPT](#integration-chatgpt), [n8n](#integration-n8n) and [Make](#integration-make) below.

---

### Claude

**What it enables:** Ask Claude to search for products, track prices, check price history, set alerts and manage webhooks, all in natural language, directly in Claude.ai or the Claude desktop app.

#### How to connect: Claude.ai (web)

**Step 1: Open the Customize panel**  
Click **Customize** (sliders icon) in the left sidebar of Claude.ai or go to [claude.ai/settings/connectors](https://claude.ai/settings/connectors).

**Step 2: Add a custom connector**  
Under **Connectors**, click **+** to add a new connector.

**Step 3: Enter the MCP server URL**  
Enter a name (e.g. “Pricewatcha”) and paste:

```
https://mcp.pricewatcha.com
```

Click **Add**.

**Step 4: Done**  
Pricewatcha appears in your connector list with read-only tools (`get_api_status`, `get_job_status`, `get_product`, `get_price_history`, `search_products`, `list_price_alerts`, `get_price_alert`) and write tools (`track_product`, `create_price_alert`, `update_price_alert`, `delete_price_alert`). You can now use Pricewatcha in any Claude conversation.

**Step 5: Configure tool permissions (optional)**  
Open the connector in your connector list (or return to [claude.ai/settings/connectors](https://claude.ai/settings/connectors)) and expand **Tool permissions**.

For each tool — or for the whole **Read-only** / **Write** group — choose when Claude may call it:

| Setting | Meaning |
|---------|---------|
| **Always allow** | Claude calls the tool without asking each time |
| **Require approval** | Claude asks before each call (default for new connectors) |
| **Never allow** | Tool is blocked |

For everyday price checks and searches, set the read-only tools (or the whole read-only group) to **Always allow**. For `track_product` and alert tools, pick **Always allow** if you want friction-free writes, or keep **Require approval** if you prefer to confirm first. Alert tools need a Pricewatcha API key (`pwk_live_...`).

#### How to connect: Claude Desktop App

Same steps: **Customize** → **Connectors** → **Add custom connector** → paste `https://mcp.pricewatcha.com`. Tool permissions are configured the same way under **Tool permissions** in the connector settings.

Try:

- *“Find me a refurbished iPhone 15 Pro under €550”*
- *“Track this product URL and show me the price history”*
- *“Set an alert for this product when it drops below €500”*
- *“Notify me whenever this product gets cheaper — no price target”*

> **Note:** `track_product` is a write tool because it creates a tracking job in the background. It does not modify or delete existing data. Alert tools (`create_price_alert`, `update_price_alert`, `delete_price_alert`) change your saved alerts and require an API key.

---

### ChatGPT

**What it enables:** Search products, track prices, get price history, set price alerts and manage webhooks, directly in ChatGPT via MCP.

> **Prerequisite: Developer Mode (one-time)**  
> Custom MCP connectors require Developer Mode: **Settings → Advanced** → enable **Developer Mode**. Available on Plus, Pro, Team, Business, Enterprise and Edu (not on the free plan). Pricewatcha tools only work while Developer Mode stays on.

**Step 1:** Go to **Settings → Apps** and click **Add custom connector**.

**Step 2:** Paste the MCP URL:

```
https://mcp.pricewatcha.com
```

**Optional connector logo:** PNG, max 10 KB. [Download from https://pricewatcha.com/static/img/mcp/chatgpt-logo.png](https://pricewatcha.com/static/img/mcp/chatgpt-logo.png)

**Step 3: Authentication:** Select **OAuth**. ChatGPT handles the flow; you may see a brief authorization prompt on first connect.

**Step 4: Done.** Example prompts:

- *“Search for a refurbished iPhone 15 Pro under €550”*
- *“Track this product URL and show me the price history”*
- *“Notify me whenever this product gets cheaper — no price target”*

> **Warning:** ChatGPT may show a **DEV** label on unverified third-party connectors. Pricewatcha only works while **Developer Mode** is enabled.

---

### n8n

**What it enables:** Build automated price-monitoring workflows. Trigger actions when prices change or cross your alert threshold: no coding required.

**Typical use case:** When a tracked product drops below your threshold → send a Telegram, Slack or email notification with product name, shop, current price and alert name.

> **Note:** A publicly accessible URL is only required if you run n8n locally (self-hosted on your own machine). If you use n8n Cloud or a server-hosted instance, your n8n webhook URL is already publicly accessible: skip the tunnel step.

#### Path A: n8n Cloud or server-hosted (no tunnel needed)

1. Create a **Webhook** node in n8n → copy the **Production URL**.
2. Create a Pricewatcha alert with `webhook_url` set to the n8n URL (see below).
3. Done: `price_alert_triggered` events are delivered when thresholds are crossed.

#### Path B: n8n self-hosted locally (tunnel required)

1. Start a Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:5678` (install with `brew install cloudflared` on macOS).
2. Copy the tunnel URL (e.g. `https://abc123.trycloudflare.com`).
3. Create a **Webhook** node in n8n → note the path (e.g. `/webhook-test/abc123`).
4. Combine: `https://abc123.trycloudflare.com/webhook-test/abc123`.
5. Use this as `webhook_url` in the Pricewatcha alert.

#### Create a price alert with webhook delivery

Requires an [API key](#api-keys-headless-bootstrap):

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_YOUR_PRODUCT_ID",
    "min_threshold_price": 600.00,
    "webhook_url": "https://YOUR_N8N_URL/webhook/YOUR_PATH",
    "notify_email": false,
    "name": "Price drop alert"
  }'
```

When the current price is at or below `min_threshold_price`, Pricewatcha sends a `price_alert_triggered` event with this payload shape:

```json
{
  "event_id": "evt_...",
  "event_type": "price_alert_triggered",
  "occurred_at": "2026-05-26T20:32:07Z",
  "product": {
    "product_id": "prod_...",
    "name": "iPhone 15 Pro",
    "shop": "Swappie",
    "current_price": 559.00,
    "currency": "EUR"
  },
  "price": {
    "old_price": 559.00,
    "new_price": 559.00,
    "historical_low": 7.99,
    "historical_high": 649.00,
    "average_price": 570.44
  },
  "alert": {
    "alert_id": "77",
    "min_threshold_price": 600.00,
    "threshold_reached": "min",
    "name": "Price drop alert"
  },
  "metadata": {
    "source": "pricewatcha",
    "api_version": "v1"
  }
}
```

#### Recommended n8n workflow

1. **Webhook node** (trigger): receives the `price_alert_triggered` event.
2. **IF node**: filter: `{{ $json.body.event_type }}` equals `price_alert_triggered`.
3. **Notification node**: Email / Telegram / Slack with:
   - Product: `{{ $json.body.product.name }}`
   - Shop: `{{ $json.body.product.shop }}`
   - Current price: `{{ $json.body.price.new_price }} {{ $json.body.product.currency }}`
   - Alert name: `{{ $json.body.alert.name }}`

#### Test the connection

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/webhooks/YOUR_WEBHOOK_ID/test" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY"
```

> **Note:** The test endpoint requires a webhook subscription (`POST https://pricewatcha.com/api/v1/webhooks`), not an alert.

> **Signature verification:** Verify `X-Pricewatcha-Signature` (HMAC-SHA256) in production: see [Webhook signing](#webhook-signing).

**Alternative:** use the **HTTP Request** node: `GET https://pricewatcha.com/api/v1/search?q=…` or `GET https://pricewatcha.com/api/v1/products/PRODUCT_ID/price-history`.

---

### Make

**What it enables:** Same webhook-based automation as n8n: visual workflows without code.

| n8n | Make equivalent |
|-----|-----------------|
| Webhook Trigger | **Webhooks → Custom webhook** |
| IF node | **Router** or **Filter** |
| HTTP Request | **HTTP → Make a request** |
| Notification nodes | Email / Telegram / Slack |

1. Create a scenario with **Custom webhook** as trigger; copy the URL.
2. Create a Pricewatcha webhook subscription (same `curl` as the [n8n guide](#integration-n8n), use your Make URL as `target_url`).
3. Add a **Router** on `event_type`.
4. Test with `POST https://pricewatcha.com/api/v1/webhooks/{id}/test`.

> **Make free plan:** Up to 1,000 operations/month including webhooks, enough for personal price monitoring.

---

### Smart home

Use [price alert webhooks](#webhooks) to drive automations: scenes, notifications or lighting when a tracked product hits your target price.

See [Home Assistant](#integration-home-assistant) and [Loxone](#integration-loxone) below.

---

### Home Assistant

**What it enables:** Trigger automations when a Pricewatcha price alert fires.

**Typical use case:** Price below threshold → mobile notification, toggle `input_boolean.good_deal` or run a script.

#### Path A: Webhook trigger (recommended)

1. Add a **Webhook** trigger (e.g. webhook ID `pricewatcha_price_drop` → `https://YOUR_HA_HOST/api/webhook/pricewatcha_price_drop`).
2. Ensure the URL is reachable from the internet (Nabu Casa, reverse proxy or tunnel).
3. Create a Pricewatcha alert with that `webhook_url` ([n8n guide](#integration-n8n) shows the `curl` example).
4. In actions, use `trigger.json.product.name`, `trigger.json.price.new_price`, etc.

Example automation (YAML):

```yaml
automation:
  - alias: "Pricewatcha price drop"
    trigger:
      - platform: webhook
        webhook_id: pricewatcha_price_drop
        allowed_methods: [POST]
        local_only: false
    action:
      - service: notify.notify
        data:
          title: "Price alert: {{ trigger.json.product.name }}"
          message: >-
            {{ trigger.json.product.shop }} ·
            {{ trigger.json.price.new_price }}
            {{ trigger.json.product.currency }}
```

#### Path B: REST sensor (poll)

```yaml
rest:
  - resource: "https://pricewatcha.com/api/v1/products/prod_YOUR_PRODUCT_ID"
    scan_interval: 3600
    sensor:
      - name: "Tracked product price"
        value_template: "{{ value_json.current_price }}"
        unit_of_measurement: "EUR"
```

No API key required for read endpoints. Polling is simpler but less real-time than webhooks.

> **Signature verification:** Validate `X-Pricewatcha-Signature` in production: see [Webhook signing](#webhook-signing).

---

### Loxone

**What it enables:** Poll current prices from Pricewatcha on a schedule and trigger Loxone programs when a price threshold is reached. Works with both Miniserver Generation 1 and Generation 2.

#### Path A — Poll current price (Virtueller HTTP Eingang)

Loxone's **Virtueller HTTP Eingang** (Virtual HTTP Input) fetches a URL at a configurable interval and extracts values via **Command Recognition**. Each extracted value becomes a Loxone input that can be used in your programs.

**Gen2 — direct HTTPS (no middleware needed)**

Miniserver Gen2 supports HTTPS natively and can call the Pricewatcha API directly.

**Gen1 — via LoxBerry https2http Plugin**

Miniserver Gen1 does not support HTTPS. Install the [https2http Plugin](https://wiki.loxberry.de/plugins/https2http/start) on LoxBerry. It acts as an HTTPS proxy: LoxBerry fetches the Pricewatcha HTTPS response and serves it to Loxone over HTTP.

**Step 1 — Find your product ID**

Search for your product and note the `product_id` (format: `prod_...` or use a demo product like `demo_iphone_15_pro`):

```
GET https://pricewatcha.com/api/v1/search?q=YOUR+PRODUCT
```

**Step 2 — Create a Virtueller HTTP Eingang in Loxone Config**

In Loxone Config, go to **Periphery → Virtual Inputs → Virtual HTTP Input**.

Set the URL based on your Miniserver generation:

| Generation | URL to enter |
|---|---|
| **Gen2** (direct) | `https://pricewatcha.com/api/v1/products/prod_YOUR_PRODUCT_ID` |
| **Gen1** (via LoxBerry) | `http://YOUR_LOXBERRY_IP/plugins/https2http/?url=https://pricewatcha.com/api/v1/products/prod_YOUR_PRODUCT_ID` |

Set the **polling interval** (Abfragezyklus), e.g. `3600` seconds (every hour).

No API key or authentication required — the product endpoint is public.

**Step 3 — Add Virtueller HTTP Eingang Befehle (Command Recognition)**

For each value you want to extract, add a **Virtueller HTTP Eingang Befehl** (Virtual HTTP Input Command) to the input. Command Recognition searches the raw JSON response for a pattern and extracts a value.

The Pricewatcha product API returns JSON like this:

```json
{
  "product_id":"prod_...",
  "name":"Apple iPhone 15 Pro 128GB (Refurbished)",
  "shop":"Back Market",
  "current_price":563.0,
  "currency":"EUR",
  "status":"active"
}
```

Add one Befehl per value you need:

| Value | Command Recognition pattern |
|-------|---------------------------|
| Current price (numeric) | `"current_price":\v` |
| Product name (text) | `"name":"\a` |
| Shop name (text) | `"shop":"\a` |
| Currency (text) | `"currency":"\a` |

**Pattern syntax reference:**

- `\v` — extracts a **numeric** value at this position
- `\a` — extracts a **text** value (reads until next `"`)
- `\i...\i` — skip/ignore text between markers (use to navigate to the right position in the JSON)

> **Note:** **Tip:** Loxone Config has a built-in pattern tester. When entering the Command Recognition pattern, click the **>** button on the right side of the input field. The **Edit Command Recognition** dialog opens — enter the Pricewatcha product URL, click **"Daten abfragen"**, and Loxone Config fetches the live response and highlights the matched value in green. This lets you verify each pattern before saving.



**Step 4 — Connect to your program**

Each Befehl output is a numeric or text value you can use directly in Loxone programs:

- Connect `current_price` to a **Threshold Switch** (Schalter mit Schwellwert) → fires when price drops below your target
- Connect the threshold switch output to a **Push Notification**, lighting scene, or any other Loxone action

> **Note:** **No API key required** — the product detail endpoint is public. You only need an API key for alerts and webhooks (Path B).



#### Path B — Real-time price alerts via LoxBerry

Loxone cannot directly receive Pricewatcha webhooks because Pricewatcha requires a publicly reachable HTTPS endpoint, and the Miniserver is typically behind NAT without a public IP. This applies to both Gen1 and Gen2.

LoxBerry acts as the middleware: it receives the Pricewatcha webhook and forwards the data to the Miniserver via MQTT.

The receiver URL depends on your LoxBerry version:

| LoxBerry version | Receiver URL |
|---|---|
| **3.0+** (MQTT built-in, no plugin needed) | `http://YOUR_LOXBERRY_IP/system/tools/mqtt/receive.php` |
| **2.x** (install MQTT Gateway Plugin first) | `http://YOUR_LOXBERRY_IP/plugins/mqttgateway/receive.php` |

**Step 1 — Create a Pricewatcha API key**

Create an [API key](#api-keys-headless-bootstrap) on this page (requires login). Alerts and webhooks require authentication.

**Step 2 — Create a Pricewatcha price alert pointing to LoxBerry**

```bash
curl -s -X POST "https://pricewatcha.com/api/v1/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_YOUR_PRODUCT_ID",
    "min_threshold_price": 500.00,
    "webhook_url": "http://YOUR_LOXBERRY_IP/system/tools/mqtt/receive.php",
    "notify_email": false,
    "name": "Price drop alert"
  }'
```

**Step 3 — Configure LoxBerry MQTT Subscriptions**

In the LoxBerry MQTT configuration, subscribe to topic `rcvr/#`. The incoming JSON payload is parsed automatically. Map the relevant fields (e.g. `event_type`, `price/new_price`) to Loxone Virtual Inputs via MQTT subscriptions.

**Step 4 — In Loxone Config**

Connect the Virtual Input (triggered by the MQTT subscription) to your notification or automation program.

> **Warning:** **Public reachability required:** Pricewatcha must reach your LoxBerry webhook URL over the internet. Use **Loxone Remote Connect** or configure port forwarding on your router. For local testing without internet exposure, use the Pricewatcha test endpoint to trigger a manual delivery: `POST https://pricewatcha.com/api/v1/webhooks/{id}/test`



> **Note:** **Alternative middleware:** ioBroker with its Loxone adapter can also serve as middleware for receiving Pricewatcha webhooks. See the [ioBroker documentation](https://www.iobroker.net) for setup details.

---

## SDKs

Official **Python** and **TypeScript** client libraries live in [`sdks/`](https://github.com/pricewatcha/pricewatcha-api/tree/main/sdks) on GitHub.

They support the async **track → poll → read** workflow. Use the OpenAPI schema or plain HTTP from any other language.

### Python

```python
from pricewatcha import Pricewatcha

client = Pricewatcha()  # public endpoints, no key needed

## With an API key (alerts, webhooks, …)
client = Pricewatcha(api_key="pwk_live_YOUR_KEY")
```

Install from the [Python SDK](https://github.com/pricewatcha/pricewatcha-api/tree/main/sdks/python) on GitHub. Setup: [sdks/python/README.md](https://github.com/pricewatcha/pricewatcha-api/blob/main/sdks/python/README.md).

### TypeScript

```typescript
import { PricewatchaClient } from "@pricewatcha/sdk";

const client = new PricewatchaClient();  // public endpoints, no key needed

const authedClient = new PricewatchaClient({ apiKey: "pwk_live_YOUR_KEY" });
```

Install from the [TypeScript SDK](https://github.com/pricewatcha/pricewatcha-api/tree/main/sdks/typescript) on GitHub. Setup: [sdks/typescript/README.md](https://github.com/pricewatcha/pricewatcha-api/blob/main/sdks/typescript/README.md).

### Client generation

Generate clients in other languages from the [OpenAPI spec](https://github.com/pricewatcha/pricewatcha-api/blob/main/openapi/openapi.yaml) or live `GET https://pricewatcha.com/api/v1/openapi.json` (OpenAPI Generator, Speakeasy, Kiota and similar tools).

---

## Changelog

All notable changes to the **public API contract**, SDKs and MCP server in this repository.

Package / release versioning uses **0.1.x**. HTTP API paths remain `/api/v1`.

### 0.1.6 - 2026-08-26

#### Changed

- **Search rate limits:** `GET /api/v1/search` now has its own stacked quotas (~20 / 60s, ~60 / hour, ~200 / day per client), separate from generic catalog reads. Polling the same queries on a short interval returns HTTP `429` with `X-RateLimit-Policy` `search`, `search_hourly`, or `search_daily`.
- **Product read rate limits:** `GET /products/{id}` and `/price-history` keep the per-minute burst and add hourly/daily caps (~180 / hour, ~600 / day).
- **Abuse notices:** exhausting the anonymous **daily** search or product-read quota (`search_daily` / `read_daily`) counts toward the same IP strike threshold as `track_daily`. After several distinct UTC days the client is asked to contact `info@pricewatcha.com` (`X-Pricewatcha-Restriction: notice`); if there is no reply the IP is blocked. Default restriction scope is all of `/api/v1` except health/discovery.

### 0.1.5 - 2026-08-24

#### Changed

- **Search matching:** `GET /api/v1/search?q=` uses case-insensitive **token AND** (all terms must appear; order does not matter) instead of requiring the full query as one contiguous substring. Hyphens, slashes and similar punctuation are normalized to spaces (`Darth-Vader` ≡ `Darth Vader`, `1/6` ≡ `1 6`). Contiguous phrase matches still rank higher. Minus-prefixed exclude terms are unchanged.

### 0.1.4 - 2026-08-23

#### Added

- **Directional price alerts:** `notify_on_drop` and `notify_on_rise` on `POST`/`PATCH`/`GET /api/v1/alerts`. Either flag is enough — a numeric threshold is no longer required.
- **MCP alert tools:** `create_price_alert`, `list_price_alerts`, `get_price_alert`, `update_price_alert`, `delete_price_alert` (API key required). Same directional flags as the HTTP API.
- **Google product category:** `google_product_category_id` and `google_product_category_name` on `GET /api/v1/products/{id}`, `GET /api/v1/search` (and MCP `get_product` / `search_products` / completed track jobs). Always present in responses (`null` when unset); search needs no extra query parameter.
- **Search exclude terms:** `GET /api/v1/search?q=` accepts minus-prefixed tokens (e.g. `iPhone 15 -cover -hülle`) to drop products whose name, shop or URL contains those terms. Case-insensitive. `limit` applies after exclusion.
- **Abuse / IP restrictions:** repeated anonymous daily-limit hits may start a grace/notice period (API still works, `X-Pricewatcha-Restriction: notice`), then a block (`403` `access_restricted`). Contact `info@pricewatcha.com`.

### 0.1.3 - 2026-08-17

#### Changed

- **Track concurrent slots:** `queued`/`processing` jobs older than the scrape timeout are failed automatically (startup + `POST /track`), so a deploy or hung worker cannot block a client forever.
- **Same-URL retries:** a second `POST /track` for a URL that already has an in-flight job for that client returns the existing `job_id` instead of HTTP 429.

### 0.1.2 - 2026-08-13

#### Changed

- **Track rate limits:** anonymous quotas stay at ~2 concurrent / 10 per minute / 40 per hour / 80 per day. Client identity prefers `CF-Connecting-IP` (then `True-Client-IP`, then `X-Forwarded-For`) so Cloudflare edge IPs are not separate buckets.
- **Authenticated track quotas:** API key or login session on `POST /track` receives higher **per-account** limits (~4 concurrent / 20 per minute / 120 per hour / 400 per day). The account is stored on the track job even without a callback.
- MCP callers can be rate-limited by a stable forwarded client id instead of a shared egress IP.

### 0.1.1 - 2026-06-28

#### Changed

- Removed Public Preview branding from API docs, OpenAPI spec and SDKs. Discovery status is **available**.

### 0.1.0 - 2026-06-03

Initial release of the public API, official SDKs and remote MCP server.

#### Added

- `GET /api/v1/health`
- `GET /api/v1`: discovery document
- `POST /api/v1/track`: async ingestion (**200**, bounded long-poll ~25s)
- `GET /api/v1/jobs/{jobId}`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/price-history`
- `GET /api/v1/search?q=`
- `GET /api/v1/openapi.json`
- Demo catalog: `demo_iphone_15_pro`, `demo_galaxy_s24`
- Rate limit response headers on v1 endpoints
- **API keys**: `POST /api/keys`, `GET /api/keys`, `DELETE /api/keys/{id}` (`pwk_live_...`)
- **Alerts**: `POST/GET/PATCH/DELETE /api/v1/alerts` (API key required)
- **Webhooks**: full CRUD at `/api/v1/webhooks`, test delivery, delivery logs (API key required)
- **Official MCP server**: remote HTTP at `https://mcp.pricewatcha.com` (no API key for MCP connection)
- **Docs**: API key as default credential; login session token for [headless key bootstrap](headless-bootstrap.md) only

#### Notes

- Read endpoints remain open without authentication; API keys required for alerts and webhooks
- Endpoints and fields may change without notice

---

### Repository layout

```
openapi/              OpenAPI 3.1 specification
docs/                 API guides (source for README and Developer page)
examples/             curl and SDK samples
sdks/python/          Official Python package
sdks/typescript/      Official TypeScript package
mcp/                  MCP tool schema (reference)
mcp-server/           MCP server (TypeScript)
public-demo/          Demo product IDs
```

**Examples:** [`examples/`](examples/)

**MCP:** [`mcp/README.md`](mcp/README.md) · [`mcp-server/`](mcp-server/)

---

### Disclaimers

- **API stability**: endpoints, fields and rate limits may change.
- **Prices are snapshots**: always verify on the merchant site.
- **Not financial advice**: trends are derived from historical data only.

### License

Apache License 2.0: see [LICENSE](LICENSE).

### Security

Report vulnerabilities responsibly: [SECURITY.md](SECURITY.md).

---

## Support

Questions about the API, integration issues or unexpected behaviour: **[support@pricewatcha.com](mailto:support@pricewatcha.com)**.

If your IP received HTTP `403` with `access_restricted`, or a notice header (`X-Pricewatcha-Restriction: notice`), write to **[info@pricewatcha.com](mailto:info@pricewatcha.com)**. See [Abuse and IP restrictions](rate-limits.md).

For bugs or documentation fixes in this repository, [open a GitHub issue](https://github.com/pricewatcha/pricewatcha-api/issues).
