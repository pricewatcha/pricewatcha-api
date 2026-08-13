# Changelog {#changelog}

All notable changes to the **public API contract**, SDKs and MCP server in this repository.

Package / release versioning uses **0.1.x**. HTTP API paths remain `/api/v1`.

## 0.1.2 - 2026-08-13

### Changed

- **Track rate limits:** anonymous quotas stay at ~2 concurrent / 10 per minute / 40 per hour / 80 per day. Client identity prefers `CF-Connecting-IP` (then `True-Client-IP`, then `X-Forwarded-For`) so Cloudflare edge IPs are not separate buckets.
- **Authenticated track quotas:** API key or login session on `POST /track` receives higher **per-account** limits (~4 concurrent / 20 per minute / 120 per hour / 400 per day). The account is stored on the track job even without a callback.
- MCP callers can be rate-limited by a stable forwarded client id instead of a shared egress IP.

## 0.1.1 - 2026-06-28

### Changed

- Removed Public Preview branding from API docs, OpenAPI spec and SDKs. Discovery status is **available**.

## 0.1.0 - 2026-06-03

Initial release of the public API, official SDKs and remote MCP server.

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

### Notes

- Read endpoints remain open without authentication; API keys required for alerts and webhooks
- Endpoints and fields may change without notice

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
