import type { Request, RequestHandler, Response } from "express";

import { isPublicUnguardedPath } from "./public-paths.js";

type AccessLogFn = (line: string) => void;

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}…`;
}

function extractJsonRpcMethod(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const method = (body as { method?: unknown }).method;
  return typeof method === "string" && method.length > 0 ? method : undefined;
}

function authKind(req: Request): "bearer" | "none" {
  const auth = headerValue(req.headers.authorization);
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return "bearer";
  }
  return "none";
}

function requestPath(req: Request): string {
  const raw = req.originalUrl || req.url || req.path || "/";
  const q = raw.indexOf("?");
  return q === -1 ? raw : raw.slice(0, q);
}

/**
 * One-line access logs for diagnosing OpenAI Scan Tools / connector traffic.
 * Skips noisy public probe paths (health, favicons). Never logs Authorization tokens.
 */
export function createAccessLogMiddleware(
  log: AccessLogFn = console.log,
): RequestHandler {
  return (req: Request, res: Response, next) => {
    const path = requestPath(req);
    if (isPublicUnguardedPath(path, req.method) && path !== "/") {
      next();
      return;
    }

    const started = Date.now();
    res.on("finish", () => {
      const origin = headerValue(req.headers.origin) ?? "-";
      const ua = truncate(headerValue(req.headers["user-agent"]) ?? "-", 80);
      const accept = truncate(headerValue(req.headers.accept) ?? "-", 60);
      const contentType = truncate(
        headerValue(req.headers["content-type"]) ?? "-",
        40,
      );
      const rpc = extractJsonRpcMethod(req.body) ?? "-";
      const ms = Date.now() - started;
      log(
        `access ${req.method} ${path} status=${res.statusCode} ${ms}ms ` +
          `auth=${authKind(req)} origin=${origin} rpc=${rpc} ` +
          `accept=${accept} content-type=${contentType} ua=${ua}`,
      );
    });

    next();
  };
}
