import { DEFAULT_BASE_URL, PricewatchaClient } from "@pricewatcha/sdk";

const ENV_BASE_URL = "PRICEWATCHA_API_BASE_URL";

let sharedClient: PricewatchaClient | null = null;
let sharedBaseUrl: string | null = null;

/** Resolve API base URL from environment (no auth required). */
export function getApiBaseUrl(): string {
  const fromEnv = process.env[ENV_BASE_URL]?.trim();
  return (fromEnv || DEFAULT_BASE_URL).replace(/\/$/, "");
}

/** Shared SDK client — all MCP tools use this (no duplicated HTTP logic). */
export function getClient(): PricewatchaClient {
  const baseUrl = getApiBaseUrl();
  if (!sharedClient || sharedBaseUrl !== baseUrl) {
    sharedClient = new PricewatchaClient({
      baseUrl,
      headers: { "User-Agent": "@pricewatcha/mcp-server/0.1.0" },
    });
    sharedBaseUrl = baseUrl;
  }
  return sharedClient;
}
