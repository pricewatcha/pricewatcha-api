# Rate limits {#rate-limits}

## Current limits (indicative)

The following limits apply and may change without notice.

| Class | Endpoint | Anonymous | Authenticated (API key) |
|--------|----------|-----------|-------------------------|
| Track (concurrent) | `POST /track` | ~2 in-flight jobs | ~4 in-flight jobs |
| Track (burst) | `POST /track` | ~10 jobs / 60s | ~20 jobs / 60s |
| Track (hourly) | `POST /track` | ~40 jobs / hour | ~120 jobs / hour |
| Track (daily) | `POST /track` | ~80 jobs / day | ~400 jobs / day |
| Job poll | `GET /jobs/{id}` | ~40 req/min per client | same |
| Read | `/search`, `/products`, `/price-history` | ~60–120 req/min per client | same |
| Health | `/health` and `/` | Unlimited | Unlimited |

Send `Authorization: Bearer pwk_live_…` on `POST /track` to use the authenticated tier. Track remains available without a key at the anonymous limits.

> **Client identity:** anonymous limits are keyed by client IP. Behind Cloudflare the API prefers `CF-Connecting-IP` over `X-Forwarded-For` so edge proxy IPs are not treated as distinct clients. The hosted MCP server forwards a stable `X-Pricewatcha-Client-Id` (OAuth token hash, else connecting-IP hash) with a shared proxy secret so MCP callers are not all bucketed under one egress IP. Authenticated track quotas are keyed by account (`owner_id`), not IP.

> Monitor `X-RateLimit-Remaining` and honor `429` with exponential backoff. `X-RateLimit-Policy` names which window the headers refer to (`track`, `track_hourly`, `track_daily`, `track_concurrent`, `job_read`, or `read`).

**Track quotas are counted from persisted jobs** (`api_track_jobs` by client key or account), so they apply across multiple app instances. A long-poll that holds the HTTP connection for ~25s still counts as **one** track job when created — sequential tracks spaced farther apart than 60s will not trip the burst window, but hourly/daily and concurrent caps still apply.

Agents should prefer: start track → poll `GET /jobs/{id}` with backoff (not every 1–2s) → read product/history once complete. Retrying `POST /track` with the same URL while that job is still `queued`/`processing` reuses the existing job and does not consume another concurrent slot. Jobs left `queued`/`processing` longer than the scrape timeout (default 600s) are failed so slots cannot leak across deploys.

Exact numbers may change without notice (env overrides: `API_V1_TRACK_*`, `API_V1_TRACK_AUTH_*`, `API_V1_JOB_READ_*`, `API_V1_READ_*`).

## Headers

When rate limiting is active, responses may include:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in the window |
| `X-RateLimit-Remaining` | Requests left in the window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `X-RateLimit-Policy` | Which window the headers describe |

## HTTP 429

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

Operators can receive an email when hourly/daily/concurrent track limits trip (cooldown per client; see `API_V1_RATE_LIMIT_ALERT_*`).

## Abuse and IP restrictions {#abuse}

Sustained abuse of the anonymous track quota (for example exhausting the daily limit on several days from the same IP) may trigger an **in-app restriction**, not only `429`.

1. **Notice (grace period).** The API returns HTTP `403` with `error.code` `access_restricted` and a message that a block is pending. Track jobs are not created during this window.
2. **Block.** If there is no reply, the IP is blocked. Further calls keep returning `403` / `access_restricted` with a shorter blocked message.

Email **[info@pricewatcha.com](mailto:info@pricewatcha.com)** to discuss terms or restore access. Do not retry until access is restored — retries will not lift the restriction.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
