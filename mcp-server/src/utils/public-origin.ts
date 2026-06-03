import type { Request } from "express";

function firstHeaderValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.split(",")[0]?.trim() || undefined;
}

/** Public origin as seen by the client (respects Express trust proxy + forwarded headers). */
export function getPublicOriginFromRequest(req: Request): URL {
  const host = firstHeaderValue(req.get("x-forwarded-host")) ?? firstHeaderValue(req.get("host"));
  if (!host) {
    throw new Error("Missing Host header");
  }

  const protocol =
    firstHeaderValue(req.get("x-forwarded-proto")) ?? req.protocol ?? "https";

  return new URL(`${protocol}://${host}`);
}

export function getMcpResourceUrlFromRequest(req: Request): URL {
  return getPublicOriginFromRequest(req);
}
