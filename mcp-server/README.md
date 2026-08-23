# Pricewatcha MCP Server

**Official** [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes [Pricewatcha](https://pricewatcha.com) price intelligence to AI Agents.

Turn any product URL into structured price intelligence — without reimplementing HTTP or scraping logic. This server is a thin layer on top of the official [`@pricewatcha/sdk`](../sdks/typescript/) and the public API (`/api/v1`).

## Connect

The official MCP server is publicly available — no installation required:

```
https://mcp.pricewatcha.com
```

| Client | How to connect |
|--------|---------------|
| **Claude** | Settings → Connectors → Add custom connector → paste URL |
| **ChatGPT** | Settings → Apps → Connect an app → paste URL |
| **Other MCP clients** | Use the URL above with Streamable HTTP transport |

No API key required for catalog reads. Price-alert tools require a key from [pricewatcha.com/en/developers](https://pricewatcha.com/en/developers).

See also [`../mcp/README.md`](../mcp/README.md).

## What Pricewatcha offers to developers

MCP clients (Claude, ChatGPT and custom agents) can call tools to:

- Check API availability
- Start async product URL tracking (bounded ~25s server-side long-poll)
- Poll tracking jobs
- Read product data and price history
- Search the full product catalog (name, URL, shop/platform)
- Create and manage price alerts — including drop/rise notifications without a numeric threshold

No Pricewatcha API key is required for the upstream `/api/v1` read endpoints or for the public MCP connection at `https://mcp.pricewatcha.com`. Alert tools take `api_key` (`pwk_live_...`).

> Webhook management MCP tools are planned for a future release. Webhooks remain available via the HTTP API.

## Available tools

| Tool | Description |
|------|-------------|
| `get_api_status` | Health + API discovery |
| `track_product` | `POST /track` — bounded long-poll (~25s); fast shops return `completed` with product |
| `get_job_status` | `GET /jobs/{jobId}` — poll until `completed` or `failed` |
| `get_product` | Product intelligence by `product_id` |
| `get_price_history` | History, trend, aggregates |
| `search_products` | Keyword search |
| `create_price_alert` | Create an alert (`notify_on_drop` / `notify_on_rise` and/or thresholds). Requires `api_key` |
| `list_price_alerts` | List your alerts. Requires `api_key` |
| `get_price_alert` | Get one alert. Requires `api_key` |
| `update_price_alert` | Update thresholds, directional flags, or status. Requires `api_key` |
| `delete_price_alert` | Delete an alert. Requires `api_key` |

## Example agent workflows

**Track this product URL**

1. `track_product` with the merchant URL — fast shops return `status: "completed"` with `product`
2. If `status: "running"`, poll `get_job_status` with `job_id` until terminal state

**Check whether a product is historically cheap**

1. `get_price_history` with `product_id` (e.g. `demo_iphone_15_pro`)
2. Compare `current_price` to `historical_low`, `average_price` and `trend`

## Demo catalog (no scrape)

- `demo_iphone_15_pro`
- `demo_galaxy_s24`

## Data boundaries

- **Public:** product names, shops, URLs, prices, currency, history, trends, search results.
- **Private (never returned):** user emails, accounts, watchlists, alert thresholds and notification settings.

See [`../docs/privacy-and-data.md`](../docs/privacy-and-data.md).

## Architecture

```
MCP Client  →  HTTPS POST /  →  mcp-server (HTTP)  →  @pricewatcha/sdk  →  /api/v1
```

No ingestion or scraping in this package — only HTTP calls to `/api/v1`.

Each MCP request derives a stable client id (OAuth bearer hash, else connecting-IP hash) and — when `PRICEWATCHA_MCP_PROXY_SECRET` matches the API's `API_V1_MCP_PROXY_SECRET` — forwards it as `X-Pricewatcha-Client-Id` so API rate limits apply per caller, not the shared MCP egress IP.

## Environment

| Variable | Required | Effect |
|----------|----------|--------|
| `PRICEWATCHA_API_BASE_URL` | production | Upstream `/api/v1` base URL |
| `PRICEWATCHA_MCP_PROXY_SECRET` | recommended | Shared secret with API (`API_V1_MCP_PROXY_SECRET`) for per-caller rate limits |

## License

Apache-2.0 — see [LICENSE](../LICENSE).
