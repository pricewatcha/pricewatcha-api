import type { RequestHandler } from "express";

import { getMcpAllowedOrigins } from "../config.js";
import { isPublicUnguardedPath } from "./public-paths.js";

/**
 * Rejects browser requests with a disallowed Origin header (DNS rebinding protection).
 * Non-browser MCP clients that omit Origin pass through unchanged.
 */
export function createOriginValidationMiddleware(
  allowedOrigins: ReadonlySet<string> = getMcpAllowedOrigins(),
): RequestHandler {
  return (req, res, next) => {
    if (isPublicUnguardedPath(req.path, req.method)) {
      next();
      return;
    }

    const originHeader = req.headers.origin;
    if (!originHeader || typeof originHeader !== "string") {
      next();
      return;
    }

    const origin = originHeader.trim().replace(/\/$/, "");
    if (allowedOrigins.has(origin)) {
      next();
      return;
    }

    res.status(403).json({
      error: "forbidden",
      message: "Origin not allowed",
    });
  };
}
