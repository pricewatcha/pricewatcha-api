import type { Request, RequestHandler, Response } from "express";

import { reportMcpAccessEvent } from "../utils/mcp-access-ingest.js";
import { deriveMcpClientId } from "../utils/request-context.js";
import { resolveClientOriginFromRequest } from "../utils/client-origin.js";
import { isPublicUnguardedPath } from "./public-paths.js";

type AccessLogFn = (line: string) => void;

const OAUTH_PATHS = new Set([
  "/token",
  "/authorize",
  "/register",
  "/revoke",
]);

const MCP_TRANSPORT_PATHS = new Set(["/", "/mcp"]);

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

function formField(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Safe OAuth token/register diagnostics — never logs secrets, codes, or tokens. */
function oauthDiag(req: Request, path: string): string {
  if (!OAUTH_PATHS.has(path)) {
    return "";
  }
  const body = req.body;
  const grant = formField(body, "grant_type") ?? "-";
  const clientId = formField(body, "client_id");
  const redirectUri = formField(body, "redirect_uri") ?? "-";
  const resource = formField(body, "resource") ?? "-";
  const hasCode = Boolean(formField(body, "code"));
  const hasVerifier = Boolean(formField(body, "code_verifier"));
  const hasRefresh = Boolean(formField(body, "refresh_token"));
  const hasSecret = Boolean(formField(body, "client_secret"));
  const clientIdShort = clientId ? `${clientId.slice(0, 8)}…` : "-";
  return (
    ` grant=${grant} client_id=${clientIdShort} has_secret=${hasSecret}` +
    ` has_code=${hasCode} has_verifier=${hasVerifier} has_refresh=${hasRefresh}` +
    ` redirect_uri=${redirectUri} resource=${resource}`
  );
}

/**
 * One-line access logs for diagnosing OpenAI Scan Tools / connector traffic.
 * Skips noisy public probe paths (health, favicons). Never logs Authorization tokens.
 * Also fire-and-forgets MCP transport hits to the API usage ingest endpoint.
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
    let oauthError: string | undefined;

    if (OAUTH_PATHS.has(path)) {
      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (
          res.statusCode >= 400 &&
          body &&
          typeof body === "object" &&
          !Array.isArray(body)
        ) {
          const err = body as { error?: unknown; error_description?: unknown };
          const code = typeof err.error === "string" ? err.error : "unknown";
          const desc =
            typeof err.error_description === "string"
              ? truncate(err.error_description, 120)
              : "";
          oauthError = desc ? `${code}:${desc}` : code;
        }
        return originalJson(body);
      }) as Response["json"];
    }

    res.on("finish", () => {
      const originHeader = headerValue(req.headers.origin) ?? "-";
      const ua = truncate(headerValue(req.headers["user-agent"]) ?? "-", 80);
      const accept = truncate(headerValue(req.headers.accept) ?? "-", 60);
      const contentType = truncate(
        headerValue(req.headers["content-type"]) ?? "-",
        40,
      );
      const rpc = extractJsonRpcMethod(req.body) ?? "-";
      const ms = Date.now() - started;
      const oauth =
        OAUTH_PATHS.has(path)
          ? `${oauthDiag(req, path)}${oauthError ? ` oauth_error=${oauthError}` : ""}`
          : "";
      log(
        `access ${req.method} ${path} status=${res.statusCode} ${ms}ms ` +
          `auth=${authKind(req)} origin=${originHeader} rpc=${rpc} ` +
          `accept=${accept} content-type=${contentType} ua=${ua}${oauth}`,
      );

      if (
        MCP_TRANSPORT_PATHS.has(path) &&
        (req.method || "").toUpperCase() === "POST" &&
        !OAUTH_PATHS.has(path)
      ) {
        const clientOrigin = resolveClientOriginFromRequest(req.headers);
        reportMcpAccessEvent({
          rpc: rpc === "-" ? undefined : rpc,
          status_code: res.statusCode,
          client_id: deriveMcpClientId(req),
          client_origin: clientOrigin,
          method: req.method,
          path,
        });
      }
    });

    next();
  };
}
