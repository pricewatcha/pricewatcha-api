# Data boundaries {#data-model}

Catalog **price intelligence** (current price, history, product metadata) is available without authentication. **User-specific data** (accounts, emails, alert settings, private watchlists) is never exposed through the public API.

## Readable fields

- `product_id`, name, shop/platform, product URL
- Current price, currency, last checked, status
- Price history, historical low/high, average, trend
- `data_source` and `data_source_label` when price data comes directly from a merchant feed (`merchant_feed` → `"Direct merchant data"`)
- `google_product_category_id` and `google_product_category_name` on product detail and search (null when unset). Search does not require an extra query parameter.
- Demo entries may include `"preview": true`

Search, product detail and price history return the same fields whether the product was added via dashboard, API, MCP or demo data.

## Product IDs

| Prefix | Meaning |
|--------|---------|
| `demo_*` | Static preview samples (e.g. `demo_iphone_15_pro`) |
| `prod_*` | Opaque stable ID per catalog product (one per URL entity) |

Use `product_id` from search or a completed track job for `GET /products/{productId}` and `.../price-history`.

## Webhook payloads

Deliveries include **product-level event data** only (prices, product IDs, event type), not user emails or account details. Verify authenticity with the subscription signing secret (`whsec_...`); see [Webhooks](webhooks.md#webhook-signing).

## Compliance

If you build on this API, disclose to your users that prices are informational and that merchant sites are authoritative.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
