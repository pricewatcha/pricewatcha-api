# Rate limits {#rate-limits}

## Current limits (indicative)

The following limits apply and may change without notice.

| Class | Endpoint | Approx. limit |
|--------|----------|----------------|
| Track (concurrent) | `POST /track` | ~2 in-flight jobs per client |
| Track (burst) | `POST /track` | ~10 jobs / 60s per client |
| Track (hourly) | `POST /track` | ~40 jobs / hour per client |
| Track (daily) | `POST /track` | ~80 jobs / day per client |
| Job poll | `GET /jobs/{id}` | ~40 req/min per client |
| Read | `/search`, `/products`, `/price-history` | ~60–120 req/min per client |
| Health | `/health` and `/` | Unlimited |

> **Client identity:** limits are keyed by client IP by default. The hosted MCP server forwards a stable `X-Pricewatcha-Client-Id` (OAuth token hash, else connecting-IP hash) with a shared proxy secret so MCP callers are not all bucketed under one egress IP.

> Monitor `X-RateLimit-Remaining` and honor `429` with exponential backoff. `X-RateLimit-Policy` names which window the headers refer to (`track`, `track_hourly`, `track_daily`, `track_concurrent`, `job_read`, or `read`).

**Track quotas are counted from persisted jobs** (`api_track_jobs` by client key), so they apply across multiple app instances. A long-poll that holds the HTTP connection for ~25s still counts as **one** track job when created — sequential tracks spaced farther apart than 60s will not trip the burst window, but hourly/daily and concurrent caps still apply.

Agents should prefer: start track → poll `GET /jobs/{id}` with backoff (not every 1–2s) → read product/history once complete.

Exact numbers may change without notice (env overrides: `API_V1_TRACK_*`, `API_V1_JOB_READ_*`, `API_V1_READ_*`).

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

**Agent guidance:** honor `429`, wait until `retry_after_seconds` / `X-RateLimit-Reset`, and reduce poll frequency on job status endpoints. Prefer spreading tracks over time rather than bursting near the hourly/daily caps.

Operators can receive an email when hourly/daily/concurrent track limits trip (cooldown per IP; see `API_V1_RATE_LIMIT_ALERT_*`).

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
