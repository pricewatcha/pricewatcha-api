# Async track and poll {#async-workflow}

<span class="developers-label developers-label--public">Public</span>

`POST /api/v1/track` submits a product URL and waits up to **~25 seconds** (long-poll). No API key is required. Send `Authorization: Bearer pwk_live_…` to use [higher per-account track quotas](rate-limits.md).

- Fast shops: `status: "completed"` with full `product` in the same response
- Slow shops: `status: "running"` + `job_id`: poll `GET /api/v1/jobs/{jobId}` until `completed` or `failed`
- Repeat `POST /track` for the same URL while a job is in flight returns that job instead of starting another (and instead of a concurrent 429)

Jobs are retained for **72 hours**. After expiry, `GET /jobs/{jobId}` returns **404**: use `GET /products/{productId}` instead.

## Typical flows

### Fast shop (one call)

```
POST /api/v1/track → { "status": "completed", "product": { ... } }
```

### Slow shop

```
POST /api/v1/track → { "status": "running", "job_id": "job_xxx", "hint": "..." }
GET  /api/v1/jobs/{jobId} → poll until terminal state
GET  /api/v1/products/{productId} and .../price-history
```

## Track a product

```bash
curl -s -X POST "{{API_BASE}}/track" \
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

## Poll job status

```bash
curl -s "{{API_BASE}}/jobs/job_xxxxxxxx"
```

### Completed response

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

## Job states

| Status | Meaning |
|--------|---------|
| `queued` | Job accepted, waiting to start |
| `running` | Ingestion in progress |
| `completed` | Product intelligence in `product` |
| `failed` | Scrape failed: read structured `error` (HTTP 200 job lookup) |

## Recommended client flow

1. `POST /track` with `{ "url": "..." }` → **200**
2. If `running` or `queued`, poll `GET /jobs/{jobId}` every 2–5 seconds
3. On `completed`, read `product` from the job or `GET /products/{productId}`
4. On `failed`, surface `error.code`; backoff before retrying

### Job lookup vs. scrape failure

When polling `GET /jobs/{jobId}`, interpret HTTP status and body together:

| Response | Meaning | What to do |
|----------|---------|------------|
| **HTTP 404** | No job with this `job_id` (wrong ID or job expired after 72h) | Stop polling; start a new `POST /track` if you still need the product |
| **HTTP 200** with `"status": "failed"` | Job exists, but scraping failed | Read `error.code` in the JSON body (e.g. `scrape_target_not_found`) |

A **404** is a lookup problem. A **200** with `failed` is a completed job whose scrape did not succeed.

## Track job webhooks (push) {#track-job-webhooks}

<span class="developers-label developers-label--auth">Requires auth</span>

Authenticated clients can receive a push when a track job finishes: use `callback_url` (one-off) or `webhook_id` (existing subscription). Mutually exclusive. Same rate limits as anonymous `POST /track`.

```bash
curl -s -X POST "{{API_BASE}}/track" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.backmarket.de/de-de/p/example-product",
    "callback_url": "https://n8n.example.com/webhook/track-done"
  }'
```

With `callback_url`, the track response may include `callback_secret` (`whsec_…`) once: same signing as subscription webhooks.

When the job finishes, Pricewatcha sends a webhook with event type `track_job_completed` or `track_job_failed` (same payload shape as other webhooks). If you do not use push delivery, you can still wait on `POST /track` (long-poll) or poll `GET /jobs/{jobId}` until the job reaches a terminal state.

<div class="developers-callout developers-callout--info">

Anonymous `POST /track` with `callback_url` or `webhook_id` returns `400 auth_required_for_callback`. MCP tools use track → poll (no `callback_url` in v1).

</div>

## SDK convenience

Official Python and TypeScript SDKs may provide `track_and_wait()` / `trackAndWait()`: a helper that calls `POST /track`, then polls `GET /jobs/{jobId}` until the job is `completed` or `failed` and returns the result. The HTTP API stays async-first; the helper only saves you from writing the poll loop yourself. See [SDKs](#sdks).

## Deduplication

Repeated `POST /track` for the same URL may return `completed` quickly with existing intelligence.

## Timeouts

Long-poll default is ~25 seconds. For slow shops, poll `GET /jobs/{jobId}` instead of extending the track timeout.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
