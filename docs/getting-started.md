Optional: verify connectivity with `GET {{API_BASE}}/health`. Then pick one of the three paths below.

## Quickstart {#quickstart}

### Path 1: Browse prices (no auth)

Use demo product IDs from the [demo catalog]({{GITHUB_REPO}}/tree/main/public-demo) or search the catalog:

```bash
curl -s "{{API_BASE}}/products/demo_iphone_15_pro"
curl -s "{{API_BASE}}/search?q=iphone+15&limit=10"
```

Search is **case-insensitive token AND** (all terms must appear; word order does not matter). Results include the full Pricewatcha catalog, not only URLs submitted via `POST /track`. Use `product_id` from search for product and price-history endpoints (`prod_*` or `demo_*`).

### Path 2: Track a product and get price history

```bash
curl -s -X POST "{{API_BASE}}/track" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.backmarket.de/de-de/p/example-product"}'

curl -s "{{API_BASE}}/products/{productId}/price-history"
```

`POST /track` returns HTTP 200 with a bounded server-side long-poll (~25s). Use `product_id` from the response for price history. Optional: send `Authorization: Bearer pwk_live_…` for [higher track, search and product-read quotas](#rate-limits).

Fast shops return `status: "completed"` with the full `product` in one call. Slow shops return `status: "running"` with a `job_id`. Poll `GET {{API_BASE}}/jobs/{jobId}` until the job is `completed` or `failed`. More detail: [Async track & poll](#async-workflow).

### Path 3: Price alert with webhook (API key required)

Create a key on the [Developer page]({{SITE_BASE}}/en/developers#api-keys), then:

```bash
curl -s -X POST "{{API_BASE}}/alerts" \
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

**Official documentation (full guides):** https://pricewatcha.com/en/developers
