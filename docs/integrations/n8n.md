## n8n {#integration-n8n}

**What it enables:** Build automated price-monitoring workflows. Trigger actions when prices change or cross your alert threshold: no coding required.

**Typical use case:** When a tracked product drops below your threshold → send a Telegram, Slack or email notification with product name, shop, current price and alert name.

> **Note:** A publicly accessible URL is only required if you run n8n locally (self-hosted on your own machine). If you use n8n Cloud or a server-hosted instance, your n8n webhook URL is already publicly accessible: skip the tunnel step.

### Path A: n8n Cloud or server-hosted (no tunnel needed)

1. Create a **Webhook** node in n8n → copy the **Production URL**.
2. Create a Pricewatcha alert with `webhook_url` set to the n8n URL (see below).
3. Done: `price_alert_triggered` events are delivered when thresholds are crossed.

### Path B: n8n self-hosted locally (tunnel required)

1. Start a Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:5678` (install with `brew install cloudflared` on macOS).
2. Copy the tunnel URL (e.g. `https://abc123.trycloudflare.com`).
3. Create a **Webhook** node in n8n → note the path (e.g. `/webhook-test/abc123`).
4. Combine: `https://abc123.trycloudflare.com/webhook-test/abc123`.
5. Use this as `webhook_url` in the Pricewatcha alert.

### Create a price alert with webhook delivery

Requires an [API key](#api-keys-headless-bootstrap):

```bash
curl -s -X POST "{{API_BASE}}/alerts" \
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

### Recommended n8n workflow

1. **Webhook node** (trigger): receives the `price_alert_triggered` event.
2. **IF node**: filter: `{{ $json.body.event_type }}` equals `price_alert_triggered`.
3. **Notification node**: Email / Telegram / Slack with:
   - Product: `{{ $json.body.product.name }}`
   - Shop: `{{ $json.body.product.shop }}`
   - Current price: `{{ $json.body.price.new_price }} {{ $json.body.product.currency }}`
   - Alert name: `{{ $json.body.alert.name }}`

### Test the connection

```bash
curl -s -X POST "{{API_BASE}}/webhooks/YOUR_WEBHOOK_ID/test" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY"
```

> **Note:** The test endpoint requires a webhook subscription (`POST {{API_BASE}}/webhooks`), not an alert.

> **Signature verification:** Verify `X-Pricewatcha-Signature` (HMAC-SHA256) in production: see [Webhook signing](#webhook-signing).

**Alternative:** use the **HTTP Request** node: `GET {{API_BASE}}/search?q=…` or `GET {{API_BASE}}/products/PRODUCT_ID/price-history`.
