## Home Assistant {#integration-home-assistant}

**What it enables:** Trigger automations when a Pricewatcha price alert fires.

**Typical use case:** Price below threshold → mobile notification, toggle `input_boolean.good_deal` or run a script.

### Path A: Webhook trigger (recommended)

1. Add a **Webhook** trigger (e.g. webhook ID `pricewatcha_price_drop` → `https://YOUR_HA_HOST/api/webhook/pricewatcha_price_drop`).
2. Ensure the URL is reachable from the internet (Nabu Casa, reverse proxy or tunnel).
3. Create a Pricewatcha alert with that `webhook_url` ([n8n guide](#integration-n8n) shows the `curl` example).
4. In actions, use `trigger.json.product.name`, `trigger.json.price.new_price`, etc.

Example automation (YAML):

```yaml
automation:
  - alias: "Pricewatcha price drop"
    trigger:
      - platform: webhook
        webhook_id: pricewatcha_price_drop
        allowed_methods: [POST]
        local_only: false
    action:
      - service: notify.notify
        data:
          title: "Price alert: {{ trigger.json.product.name }}"
          message: >-
            {{ trigger.json.product.shop }} ·
            {{ trigger.json.price.new_price }}
            {{ trigger.json.product.currency }}
```

### Path B: REST sensor (poll)

```yaml
rest:
  - resource: "{{API_BASE}}/products/prod_YOUR_PRODUCT_ID"
    scan_interval: 3600
    sensor:
      - name: "Tracked product price"
        value_template: "{{ value_json.current_price }}"
        unit_of_measurement: "EUR"
```

No API key required for read endpoints. Polling is simpler but less real-time than webhooks.

> **Signature verification:** Validate `X-Pricewatcha-Signature` in production: see [Webhook signing](#webhook-signing).
