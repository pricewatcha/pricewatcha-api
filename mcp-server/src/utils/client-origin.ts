/** Resolve caller site origin from Origin / User-Agent / Referer. */

const UA_URL_RE = /https?:\/\/[^\s)>;,"']+/i;

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * Normalize a URL/origin string to ``scheme://host`` (no path/query).
 */
export function normalizeClientOrigin(raw: string | undefined | null): string | undefined {
  const text = (raw || "").trim();
  if (!text || text === "-") {
    return undefined;
  }
  let candidate = text;
  if (!candidate.includes("://")) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    const scheme = parsed.protocol.replace(":", "").toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      return undefined;
    }
    const host = (parsed.hostname || "").trim().toLowerCase();
    if (!host) {
      return undefined;
    }
    const port = parsed.port;
    if (
      port &&
      !(
        (scheme === "https" && port === "443") ||
        (scheme === "http" && port === "80")
      )
    ) {
      return `${scheme}://${host}:${port}`;
    }
    return `${scheme}://${host}`;
  } catch {
    return undefined;
  }
}

/** First http(s) URL embedded in a User-Agent (e.g. mcpbeat (+https://mcpbeat.com/…)). */
export function originFromUserAgent(userAgent: string | undefined | null): string | undefined {
  const ua = (userAgent || "").trim();
  if (!ua) {
    return undefined;
  }
  const match = UA_URL_RE.exec(ua);
  if (!match) {
    return undefined;
  }
  return normalizeClientOrigin(match[0]);
}

/**
 * Prefer Origin, else UA-embedded URL, else Referer — as scheme://host.
 */
export function resolveClientOrigin(options: {
  origin?: string | string[] | undefined;
  userAgent?: string | string[] | undefined;
  referer?: string | string[] | undefined;
}): string | undefined {
  const origin = firstHeaderValue(options.origin);
  const userAgent = firstHeaderValue(options.userAgent);
  const referer = firstHeaderValue(options.referer);
  for (const candidate of [origin, originFromUserAgent(userAgent), referer]) {
    const normalized = normalizeClientOrigin(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

export function resolveClientOriginFromRequest(headers: {
  origin?: string | string[] | undefined;
  "user-agent"?: string | string[] | undefined;
  referer?: string | string[] | undefined;
}): string | undefined {
  return resolveClientOrigin({
    origin: headers.origin,
    userAgent: headers["user-agent"],
    referer: headers.referer,
  });
}
