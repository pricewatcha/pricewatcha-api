# Changelog

All notable changes to the **public API contract** documented in this repository.

## v1 (first release)

**v1** is the initial API version. The items below describe the first release contract.

### Added

- `GET /api/v1/health`
- `GET /api/v1`: discovery document
- `POST /api/v1/track`: async ingestion (**200**, bounded long-poll ~25s)
- `GET /api/v1/jobs/{jobId}`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/price-history`
- `GET /api/v1/search?q=`
- `GET /api/v1/openapi.json`
- Demo catalog: `demo_iphone_15_pro`, `demo_galaxy_s24`
- Rate limit response headers on v1 endpoints
- **API keys**: `POST /api/keys`, `GET /api/keys`, `DELETE /api/keys/{id}` (`pwk_live_...`)
- **Alerts**: `POST/GET/PATCH/DELETE /api/v1/alerts` (API key required)
- **Webhooks**: full CRUD at `/api/v1/webhooks`, test delivery, delivery logs (API key required)
- **Official MCP server**: remote HTTP at `{{MCP_URL}}` (no API key for MCP connection)
- **Docs**: API key as default credential; login session token for [headless key bootstrap](headless-bootstrap.md) only

### Changed

- **`POST /api/v1/track`** returns **HTTP 200** with bounded server-side long-poll (~25s); slow jobs return `status: "running"` for client polling (replaces 202 Accepted)
- **Search** (`GET /api/v1/search`) includes the full product catalog, not only API-ingested URLs and demo samples
- **Product IDs** unified to opaque `prod_*` in all responses
- **Privacy model** documented: product-level intelligence is public; user-specific data is never exposed
- **MCP server** status: official (not experimental); tools `track_product` + `get_job_status` replace older wait helpers

### Notes

- Read endpoints remain open without authentication; API keys required for alerts and webhooks
- Endpoints and fields may change without notice

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
