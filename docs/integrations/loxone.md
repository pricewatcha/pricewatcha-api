## Loxone {#integration-loxone}

**What it enables:** Poll current prices from Pricewatcha on a schedule and trigger Loxone programs when a price threshold is reached. Works with both Miniserver Generation 1 and Generation 2.

### Path A — Poll current price (Virtueller HTTP Eingang)

Loxone's **Virtueller HTTP Eingang** (Virtual HTTP Input) fetches a URL at a configurable interval and extracts values via **Command Recognition**. Each extracted value becomes a Loxone input that can be used in your programs.

**Gen2 — direct HTTPS (no middleware needed)**

Miniserver Gen2 supports HTTPS natively and can call the Pricewatcha API directly.

**Gen1 — via LoxBerry https2http Plugin**

Miniserver Gen1 does not support HTTPS. Install the [https2http Plugin](https://wiki.loxberry.de/plugins/https2http/start) on LoxBerry. It acts as an HTTPS proxy: LoxBerry fetches the Pricewatcha HTTPS response and serves it to Loxone over HTTP.

**Step 1 — Find your product ID**

Search for your product and note the `product_id` (format: `prod_...` or use a demo product like `demo_iphone_15_pro`):

```
GET {{API_BASE}}/search?q=YOUR+PRODUCT
```

**Step 2 — Create a Virtueller HTTP Eingang in Loxone Config**

In Loxone Config, go to **Periphery → Virtual Inputs → Virtual HTTP Input**.

Set the URL based on your Miniserver generation:

| Generation | URL to enter |
|---|---|
| **Gen2** (direct) | `{{API_BASE}}/products/prod_YOUR_PRODUCT_ID` |
| **Gen1** (via LoxBerry) | `http://YOUR_LOXBERRY_IP/plugins/https2http/?url={{API_BASE}}/products/prod_YOUR_PRODUCT_ID` |

Set the **polling interval** (Abfragezyklus), e.g. `3600` seconds (every hour).

No API key or authentication required — the product endpoint is public.

**Step 3 — Add Virtueller HTTP Eingang Befehle (Command Recognition)**

For each value you want to extract, add a **Virtueller HTTP Eingang Befehl** (Virtual HTTP Input Command) to the input. Command Recognition searches the raw JSON response for a pattern and extracts a value.

The Pricewatcha product API returns JSON like this:

```json
{
  "product_id":"prod_...",
  "name":"Apple iPhone 15 Pro 128GB (Refurbished)",
  "shop":"Back Market",
  "current_price":563.0,
  "currency":"EUR",
  "status":"active"
}
```

Add one Befehl per value you need:

| Value | Command Recognition pattern |
|-------|---------------------------|
| Current price (numeric) | `"current_price":\v` |
| Product name (text) | `"name":"\a` |
| Shop name (text) | `"shop":"\a` |
| Currency (text) | `"currency":"\a` |

**Pattern syntax reference:**

- `\v` — extracts a **numeric** value at this position
- `\a` — extracts a **text** value (reads until next `"`)
- `\i...\i` — skip/ignore text between markers (use to navigate to the right position in the JSON)

<div class="developers-callout developers-callout--info">

**Tip:** Loxone Config has a built-in pattern tester. When entering the Command Recognition pattern, click the **>** button on the right side of the input field. The **Edit Command Recognition** dialog opens — enter the Pricewatcha product URL, click **"Daten abfragen"**, and Loxone Config fetches the live response and highlights the matched value in green. This lets you verify each pattern before saving.

</div>

**Step 4 — Connect to your program**

Each Befehl output is a numeric or text value you can use directly in Loxone programs:

- Connect `current_price` to a **Threshold Switch** (Schalter mit Schwellwert) → fires when price drops below your target
- Connect the threshold switch output to a **Push Notification**, lighting scene, or any other Loxone action

<div class="developers-callout developers-callout--info">

**No API key required** — the product detail endpoint is public. You only need an API key for alerts and webhooks (Path B).

</div>

### Path B — Real-time price alerts via LoxBerry

Loxone cannot directly receive Pricewatcha webhooks because Pricewatcha requires a publicly reachable HTTPS endpoint, and the Miniserver is typically behind NAT without a public IP. This applies to both Gen1 and Gen2.

LoxBerry acts as the middleware: it receives the Pricewatcha webhook and forwards the data to the Miniserver via MQTT.

The receiver URL depends on your LoxBerry version:

| LoxBerry version | Receiver URL |
|---|---|
| **3.0+** (MQTT built-in, no plugin needed) | `http://YOUR_LOXBERRY_IP/system/tools/mqtt/receive.php` |
| **2.x** (install MQTT Gateway Plugin first) | `http://YOUR_LOXBERRY_IP/plugins/mqttgateway/receive.php` |

**Step 1 — Create a Pricewatcha API key**

Create an [API key](#api-keys-headless-bootstrap) on this page (requires login). Alerts and webhooks require authentication.

**Step 2 — Create a Pricewatcha price alert pointing to LoxBerry**

```bash
curl -s -X POST "{{API_BASE}}/alerts" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_YOUR_PRODUCT_ID",
    "min_threshold_price": 500.00,
    "webhook_url": "http://YOUR_LOXBERRY_IP/system/tools/mqtt/receive.php",
    "notify_email": false,
    "name": "Price drop alert"
  }'
```

**Step 3 — Configure LoxBerry MQTT Subscriptions**

In the LoxBerry MQTT configuration, subscribe to topic `rcvr/#`. The incoming JSON payload is parsed automatically. Map the relevant fields (e.g. `event_type`, `price/new_price`) to Loxone Virtual Inputs via MQTT subscriptions.

**Step 4 — In Loxone Config**

Connect the Virtual Input (triggered by the MQTT subscription) to your notification or automation program.

<div class="developers-callout developers-callout--warning">

**Public reachability required:** Pricewatcha must reach your LoxBerry webhook URL over the internet. Use **Loxone Remote Connect** or configure port forwarding on your router. For local testing without internet exposure, use the Pricewatcha test endpoint to trigger a manual delivery: `POST {{API_BASE}}/webhooks/{id}/test`

</div>

<div class="developers-callout developers-callout--info">

**Alternative middleware:** ioBroker with its Loxone adapter can also serve as middleware for receiving Pricewatcha webhooks. See the [ioBroker documentation](https://www.iobroker.net) for setup details.

</div>
