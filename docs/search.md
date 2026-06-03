# Search {#search}

Keyword search is **case-insensitive** and matches product name, URL, platform/shop and related fields. Results cover the **full Pricewatcha catalog**, not only URLs submitted via `POST /track`.

## Endpoint

`GET {{API_BASE}}/search?q=…&limit=…`

Optional `limit`: default **50**, maximum **200**.

```bash
curl -s "{{API_BASE}}/search?q=iphone&limit=10"
```

## Example response

```json
[
  {
    "product_id": "demo_iphone_15_pro",
    "name": "Apple iPhone 15 Pro 128GB (Refurbished)",
    "shop": "Back Market",
    "product_url": "https://www.backmarket.de/de-de/p/example-iphone-15-pro",
    "current_price": 563,
    "currency": "EUR",
    "status": "active",
    "preview": true
  },
  {
    "product_id": "prod_a1b2c3d4e5",
    "name": "iPhone 15 Pro",
    "shop": "Swappie",
    "product_url": "https://swappie.com/de/p/iphone-15-pro/",
    "current_price": 505,
    "currency": "EUR",
    "status": "active"
  }
]
```

Use `product_url` for direct linking without an extra `GET /products/{id}` call.

## Demo catalog (no scrape required)

Preview demo products are always available for integration testing:

```bash
curl -s "{{API_BASE}}/products/demo_iphone_15_pro"
curl -s "{{API_BASE}}/products/demo_iphone_15_pro/price-history"
curl -s "{{API_BASE}}/search?q=iphone+15+pro"
```

See the [demo catalog]({{GITHUB_REPO}}/tree/main/public-demo) on GitHub.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
