# Webhooks {#webhooks}

<span class="developers-label developers-label--auth">Requires auth</span>

Webhooks push **signed HTTP POST** requests when prices change, alert thresholds are crossed or authenticated track jobs complete.

Subscribe to event types **globally** or for a single `product_id`. Each event type is delivered as its own request.

| Scope | Behaviour |
|-------|-----------|
| **Global** (`product_id` omitted) | Price events for products **you** track (watchlist) or for which you have an **active price alert**. Not the full catalog. |
| **Scoped** (`product_id` set) | Price events for that product only. |
| **Test** (`POST /webhooks/{id}/test`) | Sends a `webhook_test` payload to verify your endpoint; no product scope. |

Catalog-wide price streaming is not supported. Use the test endpoint to verify delivery, then track products or create alerts for the events you care about.

Manage subscriptions via `POST {{API_BASE}}/webhooks`. Full schemas: `GET {{API_BASE}}/openapi.json` (tags `webhooks`, `alerts`).

<div class="developers-callout developers-callout--info">

Target URLs must use **HTTPS** and must not resolve to private or internal IP ranges.

</div>

## Event types {#event-types}

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

## Payload format {#webhook-payload}

### `price_dropped`

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

### `price_alert_triggered`

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

## Signing and verification {#webhook-signing}

Every delivery includes:

- `X-Pricewatcha-Event-Id`
- `X-Pricewatcha-Event-Type`
- `X-Pricewatcha-Timestamp` (Unix seconds)
- `X-Pricewatcha-Signature` (`sha256=<hex>`)

Signed string: `"{timestamp}.{raw_body}"` with HMAC-SHA256 and your webhook secret (`whsec_…`, shown once at subscription creation).

<div class="developers-callout developers-callout--warning">

**The webhook secret is shown only once.** Store it securely: only `secret_prefix` is shown afterward.

</div>

### Python

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

### JavaScript (Node.js)

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

## Delivery and retry {#webhook-delivery}

Failed deliveries retry up to **5** times: 1 min → 5 min → 30 min → 2 h → 12 h.

After **10** consecutive failures the subscription is auto-disabled.

### Delivery logs

```bash
curl -s "{{API_BASE}}/webhooks/{webhook_id}/deliveries" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

## Examples {#webhook-examples}

### Create a subscription

```bash
curl -s -X POST "{{API_BASE}}/webhooks" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://n8n.example.com/webhook/abc123",
    "event_types": ["price_dropped", "new_historical_low"],
    "product_id": "prod_a1b2c3d4e5"
  }'
```

### Send a test webhook

```bash
curl -s -X POST "{{API_BASE}}/webhooks/42/test" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
