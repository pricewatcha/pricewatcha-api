# Search {#search}

Keyword search is **case-insensitive**. The query is split into tokens; a product matches when **every** token appears in the normalized product name, URL, platform/shop or related fields. Word order does not matter, and punctuation such as hyphens and slashes is treated as whitespace (`Darth-Vader` matches `Darth Vader`). Results cover the **full Pricewatcha catalog**, not only URLs submitted via `POST /track`.

Exact contiguous phrases still rank above other token matches when both match.

## Endpoint

`GET {{API_BASE}}/search?q=…&limit=…`

Optional `limit`: default **50**, maximum **200**. Applied after exclude-term filtering.

Search is rate-limited separately from product reads. Anonymous callers get ~20 requests / 60s, ~60 / hour, ~200 / day; an API key raises that to ~40 / 60s, ~180 / hour, ~1000 / day per account. Honor HTTP `429` and `X-RateLimit-Policy`; see [Rate limits](rate-limits.md).

`q` supports Google-style minus-prefixed exclude terms. `q=iPhone+15+-cover+-case` returns products matching both "iPhone" and "15" that do **not** contain "cover" or "case" in the searchable fields (case-insensitive). A lone `-` is ignored.

```bash
curl -s "{{API_BASE}}/search?q=iphone&limit=10"
curl -s "{{API_BASE}}/search?q=iPhone+15+-cover+-case"
curl -s "{{API_BASE}}/search?q=Darth+Vader+DX27"
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
    "preview": true,
    "google_product_category_id": null,
    "google_product_category_name": null
  },
  {
    "product_id": "prod_a1b2c3d4e5",
    "name": "iPhone 15 Pro",
    "shop": "Swappie",
    "product_url": "https://swappie.com/de/p/iphone-15-pro/",
    "current_price": 505,
    "currency": "EUR",
    "status": "active",
    "google_product_category_id": null,
    "google_product_category_name": null
  }
]
```

Use `product_url` for direct linking without an extra `GET /products/{id}` call.

Results always include `google_product_category_id` and `google_product_category_name` (`null` when unset). You do not need an extra query parameter.

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
