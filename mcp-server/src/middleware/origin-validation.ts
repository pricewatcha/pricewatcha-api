import type { Request, RequestHandler, Response } from "express";

import { getMcpAllowedOrigins } from "../config.js";
import { isPublicUnguardedPath } from "./public-paths.js";

/** Headers browser MCP clients may send on Streamable HTTP requests. */
const CORS_ALLOW_HEADERS = [
  "Content-Type",
  "Accept",
  "Authorization",
  "MCP-Protocol-Version",
  "Mcp-Session-Id",
  "Last-Event-ID",
].join(", ");

const CORS_ALLOW_METHODS = "GET, HEAD, POST, OPTIONS";

function normalizeOriginHeader(originHeader: string): string {
  return originHeader.trim().replace(/\/$/, "");
}

function applyCorsHeaders(res: Response, origin: string): void {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  res.setHeader("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.append("Vary", "Origin");
}

function rejectDisallowedOrigin(res: Response): void {
  res.status(403).json({
    error: "forbidden",
    message: "Origin not allowed",
  });
}

/**
 * Rejects browser requests with a disallowed Origin header (DNS rebinding protection)
 * and emits CORS headers for allowlisted browser MCP clients (ChatGPT, Claude, OpenAI Platform).
 * Non-browser MCP clients that omit Origin pass through unchanged.
 */
export function createOriginValidationMiddleware(
  allowedOrigins: ReadonlySet<string> = getMcpAllowedOrigins(),
): RequestHandler {
  return (req: Request, res: Response, next) => {
    if (isPublicUnguardedPath(req.path, req.method)) {
      next();
      return;
    }

    const originHeader = req.headers.origin;
    if (!originHeader || typeof originHeader !== "string") {
      if (req.method === "OPTIONS") {
        res.setHeader("Allow", CORS_ALLOW_METHODS);
        res.status(204).end();
        return;
      }
      next();
      return;
    }

    const origin = normalizeOriginHeader(originHeader);
    if (!allowedOrigins.has(origin)) {
      rejectDisallowedOrigin(res);
      return;
    }

    applyCorsHeaders(res, origin);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
