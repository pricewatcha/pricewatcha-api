# Watchlist API {#watchlist}

<span class="developers-label developers-label--auth">Requires auth</span>

Opt into **continuous price updates** for products you care about. Watched products use the same scheduler path as the dashboard watchlist (`user_products`).

Anonymous `POST /track` remains a one-shot catalog ingestion. Without a watch (or an alert / product-scoped price webhook), prices are not refreshed on a schedule.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/watchlist` | List products you watch (`limit`, `offset`) |
| `GET` | `/api/v1/products/{productId}/watch` | Watch status for one product |
| `POST` | `/api/v1/products/{productId}/watch` | Start watching (idempotent) |
| `DELETE` | `/api/v1/products/{productId}/watch` | Stop watching |

All endpoints require an API key in `Authorization: Bearer …`. Cap: **200** watched products per account (`403 watch_limit_reached`).

## Watch a product

```bash
curl -s -X POST "{{API_BASE}}/products/prod_a1b2c3d4e5/watch" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE"
```

Example response (`200`):

```json
{
  "product_id": "prod_a1b2c3d4e5",
  "watching": true,
  "watched_at": "2026-09-07T18:00:00Z"
}
```

## Track + watch in one call

Authenticated `POST /track` accepts:

- `watch: true` — add the product to your watchlist when the job links a product
- `refresh: true` — force a re-scrape even if the URL is already in the catalog

```bash
curl -s -X POST "{{API_BASE}}/track" \
  -H "Authorization: Bearer pwk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.backmarket.de/de-de/p/example",
    "watch": true,
    "refresh": true
  }'
```

## Automatic watch

These actions also watch the product for your account:

- Creating a **price alert** (`POST /alerts`)
- Creating/updating a **product-scoped webhook** that includes price events (`price_dropped`, `price_changed`, …)

## Unwatch

`DELETE /products/{productId}/watch` fails with `409 alert_requires_watch` while an **active** alert still exists for that product. Delete or deactivate the alert first.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
