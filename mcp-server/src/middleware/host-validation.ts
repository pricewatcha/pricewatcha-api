import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import type { RequestHandler } from "express";

import { getMcpAllowedHosts } from "../config.js";
import { isPublicUnguardedPath } from "./public-paths.js";

/**
 * Host-header DNS rebinding protection for MCP routes.
 * Skips Railway/platform liveness paths that must not depend on Host allowlists.
 */
export function createHostValidationMiddleware(
  allowedHosts: string[] = [...getMcpAllowedHosts()],
): RequestHandler {
  const validate = hostHeaderValidation(allowedHosts);
  return (req, res, next) => {
    if (isPublicUnguardedPath(req.path)) {
      next();
      return;
    }
    validate(req, res, next);
  };
}
