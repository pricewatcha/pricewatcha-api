/**
 * Fire-and-forget MCP transport access events to the Pricewatcha API
 * (POST /api/v1/mcp-access) for daily usage reports.
 */

import { getMcpProxySecret } from "../config.js";
import { getApiBaseUrl } from "./client.js";

const INGEST_TIMEOUT_MS = 2500;

export type McpAccessIngestPayload = {
  rpc?: string;
  status_code: number;
  client_id: string;
  client_origin?: string;
  method?: string;
  path?: string;
  country_code?: string;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number }>;

/**
 * Report one MCP transport hit. Never throws; swallows network/timeout errors.
 */
export function reportMcpAccessEvent(
  payload: McpAccessIngestPayload,
  fetchImpl: FetchLike = fetch,
): void {
  const secret = getMcpProxySecret();
  if (!secret) {
    return;
  }
  const clientId = (payload.client_id || "").trim();
  if (!clientId) {
    return;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/mcp-access`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    status_code: payload.status_code,
    client_id: clientId,
    method: payload.method || "POST",
    path: payload.path || "/",
  };
  if (payload.rpc) {
    body.rpc = payload.rpc;
  }
  if (payload.client_origin) {
    body.client_origin = payload.client_origin;
  }
  if (payload.country_code) {
    body.country_code = payload.country_code;
  }

  void fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Pricewatcha-Proxy-Secret": secret,
      "X-Pricewatcha-Client-Id": clientId,
      ...(payload.client_origin
        ? { "X-Pricewatcha-Client-Origin": payload.client_origin }
        : {}),
      "User-Agent": "@pricewatcha/mcp-server/0.1.7",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .catch(() => {
      // Usage ingest must never affect MCP responses.
    })
    .finally(() => {
      clearTimeout(timer);
    });
}
