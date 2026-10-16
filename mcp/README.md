# MCP integration

The **official Pricewatcha MCP server** is implemented in [`../mcp-server/`](../mcp-server/).

It exposes tools for AI Agents on top of the public HTTP API and [`@pricewatcha/sdk`](../sdks/typescript/) — no duplicated ingestion logic.

## Tool reference (schema)

Machine-readable tool definitions: [`tools.schema.json`](tools.schema.json)

Implemented MCP tools (see mcp-server README):

| MCP tool | HTTP / SDK |
|----------|------------|
| `get_api_status` | `GET /health`, `GET /api/v1` |
| `track_product` | `POST /track` (bounded long-poll) |
| `get_job_status` | `GET /jobs/{jobId}` |
| `get_product` | `GET /products/{productId}` |
| `get_price_history` | `GET /products/{id}/price-history` |
| `search_products` | `GET /search?q=` |
| `create_price_alert` | `POST /alerts` (API key) |
| `list_price_alerts` | `GET /alerts` (API key) |
| `get_price_alert` | `GET /alerts/{id}` (API key) |
| `update_price_alert` | `PATCH /alerts/{id}` (API key) |
| `delete_price_alert` | `DELETE /alerts/{id}` (API key) |
| `watch_product` | `POST /products/{id}/watch` (API key) |
| `unwatch_product` | `DELETE /products/{id}/watch` (API key) |
| `list_watchlist` | `GET /watchlist` (API key) |
| `get_watch_status` | `GET /products/{id}/watch` (API key) |

Alert tools accept `notify_on_drop` / `notify_on_rise` (any price change, no threshold) and optional `min_threshold_price` / `max_threshold_price`. Pass `api_key` (`pwk_live_...`) on each alert or watchlist tool call. Creating an alert also watches the product.

> Webhook management tools are planned for a future release.

## Connecting to Claude or ChatGPT

The remote MCP server is available at:

```
https://mcp.pricewatcha.com
```

### Claude

1. Go to Settings → Connectors → **+**
2. Paste `https://mcp.pricewatcha.com`
3. All tools are discovered automatically
4. *(Optional)* Open the connector → **Tool permissions** → set read-only tools (or the whole group) to **Always allow** so Claude does not ask before every lookup; adjust `track_product` to your preference

### ChatGPT

Pricewatcha is available as an approved ChatGPT plugin in the official Plugins store.

**Setup:**
1. Open **Plugins** in ChatGPT and search for **Pricewatcha**
2. Open the listing and click **Install plugin**
3. Confirm **Connect Pricewatcha** on the authorization screen (OAuth)

No API key is required for the MCP connection. Alert and watchlist tools need a Pricewatcha API key (`pwk_live_...`).

## Agent guidelines

1. Prefer demo IDs (`demo_iphone_15_pro`) when explaining without live scrapes.
2. `track_product` waits ~25s server-side; if status is `running`, poll `get_job_status`.
3. Treat prices as informational; verify on merchant sites.
4. Honor HTTP `429` and rate limit headers.
5. Alert tools require a Pricewatcha API key (`pwk_live_...`) — create one at pricewatcha.com/en/developers. Pass it as `api_key`. Webhook management tools are not yet available via MCP.
