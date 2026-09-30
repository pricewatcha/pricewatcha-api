import type { IncomingMessage } from "node:http";
import type { RequestHandler } from "express";

const MCP_ACCEPT = "application/json, text/event-stream";

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/** Rewrite a header in both `headers` and `rawHeaders` (Hono reads rawHeaders). */
function setIncomingHeader(
  req: IncomingMessage,
  name: string,
  value: string,
): void {
  const lower = name.toLowerCase();
  req.headers[lower] = value;

  const raw = req.rawHeaders;
  let found = false;
  for (let i = 0; i < raw.length; i += 2) {
    if (raw[i].toLowerCase() === lower) {
      raw[i + 1] = value;
      found = true;
      // Keep scanning in case of duplicates; last write wins for headers map.
    }
  }
  if (!found) {
    raw.push(name, value);
  }
}

function normalizedAccept(acceptRaw: string): string | undefined {
  const normalized = acceptRaw.trim().toLowerCase();
  if (
    !normalized ||
    normalized === "*/*" ||
    normalized === "*" ||
    normalized === "application/*"
  ) {
    return MCP_ACCEPT;
  }
  const hasJson = normalized.includes("application/json");
  const hasEventStream = normalized.includes("text/event-stream");
  if (hasJson && hasEventStream) {
    return undefined;
  }
  const parts = [acceptRaw.trim()];
  if (!hasJson) {
    parts.unshift("application/json");
  }
  if (!hasEventStream) {
    parts.push("text/event-stream");
  }
  return parts.join(", ");
}

/**
 * Normalize Accept / Content-Type so the MCP SDK accepts OpenAI Platform scan
 * requests. The SDK rejects wildcard Accept headers (e.g. star/star) and
 * Content-Type text/octet-stream with 406/400, which blocks tool scanning
 * during app submission.
 *
 * See: https://github.com/openai/openai-apps-sdk-examples/issues/183
 */
export function createMcpHeaderNormalizationMiddleware(): RequestHandler {
  return (req, _res, next) => {
    const acceptRaw = headerValue(req.headers.accept) ?? "";
    const nextAccept = normalizedAccept(acceptRaw);
    if (nextAccept) {
      setIncomingHeader(req, "Accept", nextAccept);
    }

    const contentTypeRaw =
      headerValue(req.headers["content-type"])?.trim().toLowerCase() ?? "";
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      if (!contentTypeRaw || contentTypeRaw.includes("octet-stream")) {
        setIncomingHeader(req, "Content-Type", "application/json");
      }
    }

    next();
  };
}
