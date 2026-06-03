# Rate limits

## Preview Limits (indicative)

The following limits apply during public preview and may change without notice.

| Class  | Endpoint                                          | Approx. limit      |
|--------|---------------------------------------------------|--------------------|
| Track  | `POST /track`                                     | ~10 req/min per IP |
| Read   | `/search`, `/products`, `/price-history`, `/jobs` | ~60 req/min per IP |
| Health | `/health` and `/`                                 | Unlimited          |

> Monitor `X-RateLimit-Remaining` and honor `429` with exponential backoff.

Limits group into **Track** (`POST /track`, stricter, to limit ingestion abuse) and **Read** (all other `/api/v1/*`, higher, for caching-friendly reads). Exact numbers may change during preview.

## Headers

When rate limiting is active, responses may include:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in the window |
| `X-RateLimit-Remaining` | Requests left in the window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

## HTTP 429

When limited, the API returns `429 Too Many Requests` with a JSON body:

```json
{ "detail": "Rate limit exceeded. Try again later." }
```

**Agent guidance:** honor `429`, wait until `X-RateLimit-Reset` and reduce poll frequency on job status endpoints.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
