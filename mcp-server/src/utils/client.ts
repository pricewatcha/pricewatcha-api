import { PricewatchaClient, DEFAULT_BASE_URL } from "@pricewatcha/sdk";

import { getMcpProxySecret } from "../config.js";
import {
  getMcpRequestClientId,
  getMcpRequestClientOrigin,
} from "./request-context.js";

const ENV_BASE_URL = "PRICEWATCHA_API_BASE_URL";

/** Resolve API base URL from environment (no auth required). */
export function getApiBaseUrl(): string {
  const fromEnv = process.env[ENV_BASE_URL]?.trim();
  return (fromEnv || DEFAULT_BASE_URL).replace(/\/$/, "");
}

/**
 * SDK client for the current MCP request.
 *
 * Forwards a stable client id (+ shared proxy secret) so API rate limits are
 * keyed per MCP caller, not the MCP service egress IP. Also forwards the
 * caller site origin when known for usage reporting.
 */
export function getClient(options?: { apiKey?: string }): PricewatchaClient {
  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {
    "User-Agent": "@pricewatcha/mcp-server/0.1.7",
  };
  const secret = getMcpProxySecret();
  const clientId = getMcpRequestClientId();
  const clientOrigin = getMcpRequestClientOrigin();
  if (secret && clientId) {
    headers["X-Pricewatcha-Client-Id"] = clientId;
    headers["X-Pricewatcha-Proxy-Secret"] = secret;
    if (clientOrigin) {
      headers["X-Pricewatcha-Client-Origin"] = clientOrigin;
    }
  }
  return new PricewatchaClient({
    baseUrl,
    headers,
    ...(options?.apiKey ? { apiKey: options.apiKey } : {}),
  });
}
