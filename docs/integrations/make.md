## Make {#integration-make}

**What it enables:** Same webhook-based automation as n8n: visual workflows without code.

| n8n | Make equivalent |
|-----|-----------------|
| Webhook Trigger | **Webhooks → Custom webhook** |
| IF node | **Router** or **Filter** |
| HTTP Request | **HTTP → Make a request** |
| Notification nodes | Email / Telegram / Slack |

1. Create a scenario with **Custom webhook** as trigger; copy the URL.
2. Create a Pricewatcha webhook subscription (same `curl` as the [n8n guide](#integration-n8n), use your Make URL as `target_url`).
3. Add a **Router** on `event_type`.
4. Test with `POST {{API_BASE}}/webhooks/{id}/test`.

> **Make free plan:** Up to 1,000 operations/month including webhooks, enough for personal price monitoring.
