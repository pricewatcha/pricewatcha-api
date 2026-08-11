/**
 * Shared MCP server factory — tools and instructions for the remote HTTP transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerGetApiStatus } from "./tools/get-api-status.js";
import { registerGetJobStatus } from "./tools/get-job-status.js";
import { registerGetPriceHistory } from "./tools/get-price-history.js";
import { registerGetProduct } from "./tools/get-product.js";
import { registerSearchProducts } from "./tools/search-products.js";
import { registerTrackProduct } from "./tools/track-product.js";

export const SERVER_INSTRUCTIONS = `Pricewatcha turns public product URLs into structured price intelligence.

Workflow:
1. Use get_api_status to verify the API is reachable.
2. track_product submits a URL and waits briefly (~25s). Fast shops return status "completed" with product.
3. If track_product returns status "running", poll get_job_status with the job_id until completed or failed.
4. get_product / get_price_history / search_products read product-level catalog data.

Rate limits (important):
- Prefer one track at a time; avoid bursting many track_product calls. Limits are per client (~2 concurrent tracks, ~10/min, ~40/hour, ~80/day).
- When polling get_job_status, use exponential backoff (start ~3–5s, then increase; do not poll every 1–2s). Job polls are limited (~40/min).
- On error.code "rate_limited" or http_status 429: wait retry_after_seconds (or several seconds) before retrying; do not immediately retry in a tight loop.
- Spread tracks over time rather than submitting many URLs back-to-back.

Product IDs: demo_* (samples), prod_* (all catalog products). Demo: demo_iphone_15_pro, demo_galaxy_s24.
No API key required. Prices are informational; merchant sites are authoritative.

Tool errors use structured objects: error.code, error.message, error.http_status, error.retry_recommended, error.retry_after_seconds.`;

/** Tool names registered by createServer (for tests and documentation). */
export const MCP_TOOL_NAMES = [
  "get_api_status",
  "track_product",
  "get_job_status",
  "get_product",
  "get_price_history",
  "search_products",
] as const;

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "pricewatcha",
      version: "0.1.0",
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  registerGetApiStatus(server);
  registerTrackProduct(server);
  registerGetJobStatus(server);
  registerGetProduct(server);
  registerGetPriceHistory(server);
  registerSearchProducts(server);

  return server;
}
