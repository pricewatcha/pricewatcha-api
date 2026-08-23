# Errors and error codes {#errors}

Non-success responses use a structured `error` object. Inspect **`error.code`**: do not parse free-text `message` values.

## Shape

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

## Public / track / catalog codes

| Code | Typical HTTP | When |
|------|--------------|------|
| `invalid_input_format` | 400 | Malformed JSON or parameters |
| `invalid_url_type` | 400 | URL is a search/listing page, unsupported shop, etc. |
| `job_not_found` | 404 | Unknown or expired `job_id` (jobs expire after 72h) |
| `product_not_found` | 404 | Unknown `product_id` |
| `scrape_target_not_found` | 404 | Product page not found on the shop |
| `scrape_chain_exhausted` | 502 | All scraper strategies failed |
| `scrape_timeout` | 200 (job failed) | Track job exceeded the scrape timeout, or a queued/processing job was reaped after a worker loss |
| `rate_limited` | 429 | Track/read quota exceeded: honor `retry_after_seconds`. Anonymous track is per client IP; API keys use higher per-account track quotas. |
| `access_restricted` | 403 | Suspected abuse: the client IP is in a grace/notice period or is already blocked. Email [info@pricewatcha.com](mailto:info@pricewatcha.com). Do not retry until access is restored. |
| `internal_error` | 500 | Unexpected server error |

## Authentication & API keys

| Code | Typical HTTP | When |
|------|--------------|------|
| `unauthenticated` | 401 | Missing or invalid bearer token |
| `invalid_session_token` | 401 | Expired or invalid login session (not an API key) |
| `invalid_api_key` | 401 | Revoked or unknown API key |
| `api_key_limit_reached` | 403 | Account key quota exceeded |
| `api_key_not_found` | 404 | Key id not found |

## Alerts & webhooks

| Code | Typical HTTP | When |
|------|--------------|------|
| `alert_already_exists` | 409 | One alert per user per product: use `PATCH` |
| `alert_not_found` | 404 | Unknown `alert_id` |
| `webhook_not_found` | 404 | Unknown subscription |
| `webhook_limit_reached` | 403 | Subscription quota exceeded |
| `auth_required_for_callback` | 400 | `callback_url` / `webhook_id` on `POST /track` without auth |
| `callback_conflict` | 400 | Both `callback_url` and `webhook_id` set |
| `invalid_callback_url` | 400 | Callback URL not HTTPS or blocked target |

## Agent guidance

- Branch on `error.code`, not `message`.
- When `retry_recommended` is `true`, use exponential backoff and respect `retry_after_seconds`.
- HTTP **200** on `GET /jobs/{jobId}` with `status: "failed"` is a **job failure**, not a transport error.

Full schemas: live `GET {{API_BASE}}/openapi.json` and the [OpenAPI spec]({{GITHUB_REPO}}/blob/main/openapi/openapi.yaml) on GitHub.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
