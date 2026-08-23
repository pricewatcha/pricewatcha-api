## API keys (browser)

Log in on the [Developer page]({{SITE_BASE}}/en/developers#api-keys) to create and manage API keys in your browser. The full secret is shown **once** at creation.

For agents without a browser, use [headless key bootstrap](#api-keys-headless-bootstrap) below.

**Using your key** on protected endpoints:

```bash
curl -s -X POST "{{API_BASE}}/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod_a1b2c3d4e5", "notify_on_drop": true}'
```
