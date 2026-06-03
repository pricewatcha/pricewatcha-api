## Loxone {#integration-loxone}

**What it enables:** Receive price-alert webhooks on your Miniserver and drive programs from virtual inputs.

**Typical use case:** JSON webhook → virtual input `ViPriceAlert` pulses → lighting or push notification.

### Path A: Virtual HTTP Input (recommended)

1. Add a **Virtual HTTP Input** in Loxone Config (POST from the internet if reachable).
2. Create a Pricewatcha alert with that `webhook_url`.
3. Use **command recognition** on the raw JSON; map values to your program.

Example patterns for `price_alert_triggered` (match exact spacing in the monitor):

| Field | Pattern |
|-------|---------|
| Product name | `"name": "\a` |
| Current price | `"new_price": \v` |
| Threshold | `"min_threshold_price": \v` |
| Event type | `"event_type": "\a` |

See [Loxone Command Recognition](https://www.loxone.com/enen/kb/command-recognition/).

### Path B: Poll current price

1. **Virtual HTTP Output** on a schedule.
2. `GET {{API_BASE}}/products/prod_YOUR_PRODUCT_ID`
3. Extract `"current_price": \v` via command recognition.

> **Remote access:** Pricewatcha must reach your webhook URL over HTTPS: use Loxone Remote Connect or a reverse proxy.
