# Price Alert API {#alerts}

<span class="developers-label developers-label--auth">Requires auth</span>

Create price alerts that send **email notifications** and/or fire **webhooks** when a price moves.

Each tracked product has **one alert record per user**. Combine any of:

- `notify_on_drop`: notify on any price drop (no threshold required)
- `notify_on_rise`: notify on any price increase (no threshold required)
- `min_threshold_price`: notify when price drops to or below this value
- `max_threshold_price`: notify when price rises to or above this value

At least one of those four settings is required.

All endpoints require an API key in `Authorization: Bearer …`. Full schemas: `GET {{API_BASE}}/openapi.json` (tag `alerts`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/alerts` | List your alerts. Optional: `?product_id=prod_…` |
| `POST` | `/api/v1/alerts` | Create alert. `409 alert_already_exists` if one exists: use `PATCH` |
| `GET` | `/api/v1/alerts/{alertId}` | Get one alert |
| `PATCH` | `/api/v1/alerts/{alertId}` | Update thresholds, directional flags, webhook URL, email, name, `is_active` |
| `DELETE` | `/api/v1/alerts/{alertId}` | Delete (`204`) |

## Create a directional alert (no threshold)

Notify whenever the price goes down — same as the dashboard **Cheaper** toggle:

```bash
curl -s -X POST "{{API_BASE}}/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_a1b2c3d4e5",
    "notify_on_drop": true,
    "notify_email": true,
    "name": "Any drop"
  }'
```

## Create a threshold alert

```bash
curl -s -X POST "{{API_BASE}}/alerts" \
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

## List and get

```bash
curl -s "{{API_BASE}}/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"

curl -s "{{API_BASE}}/alerts?product_id=prod_a1b2c3d4e5" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"

curl -s "{{API_BASE}}/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

## Update and delete

```bash
curl -s -X PATCH "{{API_BASE}}/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"notify_on_drop": true, "min_threshold_price": null}'

curl -s -X PATCH "{{API_BASE}}/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'

curl -s -X DELETE "{{API_BASE}}/alerts/76" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
