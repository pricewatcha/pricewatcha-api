/**
 * Per-request MCP → API identity for rate limits.
 *
 * Express sets AsyncLocalStorage around each MCP POST; tools/getClient() read it
 * and forward X-Pricewatcha-Client-Id + proxy secret to /api/v1.
 */

import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

import type { Request } from "express";

export type McpRequestContext = {
  /** Opaque stable id forwarded as X-Pricewatcha-Client-Id (no raw tokens/IPs). */
  clientId: string;
};

export const mcpRequestContext = new AsyncLocalStorage<McpRequestContext>();

function sha256Prefix(value: string, chars = 32): string {
  return createHash("sha256").update(value).digest("hex").slice(0, chars);
}

/**
 * Prefer OAuth bearer token hash (per authorization). Fall back to connecting
 * client IP hash (Claude/ChatGPT egress — still better than shared MCP egress).
 */
export function deriveMcpClientId(req: Request): string {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token.length > 0) {
      return `tok_${sha256Prefix(token)}`;
    }
  }
  const ip = (req.ip || req.socket.remoteAddress || "unknown").trim() || "unknown";
  return `ip_${sha256Prefix(ip)}`;
}

export function runWithMcpRequestContext<T>(
  ctx: McpRequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return mcpRequestContext.run(ctx, fn);
}

export function getMcpRequestClientId(): string | undefined {
  return mcpRequestContext.getStore()?.clientId;
}
