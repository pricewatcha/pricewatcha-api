const MAX_WAIT_SECONDS = 600;
const MIN_WAIT_SECONDS = 5;
const STDIO_DEFAULT_WAIT_SECONDS = 180;

/** When set to "1", MCP tool errors may include debug fields such as api_base_url. */
export function isMcpDebugEnabled(): boolean {
  return process.env.PRICEWATCHA_MCP_DEBUG === "1";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Public HTTPS origin of this MCP service (OAuth issuer + protected resource metadata). */
export function getMcpIssuerUrl(): URL | undefined {
  const raw = process.env.PRICEWATCHA_MCP_ISSUER_URL?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = new URL(raw);
    return new URL(parsed.origin);
  } catch {
    return undefined;
  }
}

/** MCP resource URL (Streamable HTTP endpoint at service root). */
export function getMcpResourceUrl(): URL | undefined {
  return getMcpIssuerUrl();
}

function parseEnvFlag(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

/** Reads MCP_OAUTH_ENABLED. */
function getOAuthEnabledEnvFlag(): boolean | undefined {
  return parseEnvFlag(process.env.MCP_OAUTH_ENABLED);
}

/** OAuth for Claude Connectors — opt-in via MCP_OAUTH_ENABLED=true (default: off). */
export function isOAuthEnabled(): boolean {
  return getOAuthEnabledEnvFlag() === true;
}

export const MCP_OAUTH_SCOPES = ["mcp:tools", "offline_access"] as const;

/**
 * Default timeout_seconds for wait tools when the caller omits the parameter.
 * Stdio: 180s unless PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS is set.
 * HTTP entrypoint sets 60 when unset (see http.ts).
 */
export function getDefaultWaitSeconds(): number {
  const raw = process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= MIN_WAIT_SECONDS && n <= MAX_WAIT_SECONDS) {
      return n;
    }
  }
  return STDIO_DEFAULT_WAIT_SECONDS;
}

export function validateHttpProductionConfig(): void {
  if (!isProduction()) {
    return;
  }
  if (!process.env.PRICEWATCHA_API_BASE_URL?.trim()) {
    console.error("PRICEWATCHA_API_BASE_URL is required when NODE_ENV=production");
    process.exit(1);
  }

  const oauth = isOAuthEnabled();

  if (oauth && !getMcpIssuerUrl()) {
    console.error(
      "PRICEWATCHA_MCP_ISSUER_URL must be a valid URL when MCP_OAUTH_ENABLED=true",
    );
    process.exit(1);
  }

  if (oauth && getMcpIssuerUrl()?.protocol !== "https:") {
    console.error("PRICEWATCHA_MCP_ISSUER_URL must use https in production");
    process.exit(1);
  }
}

/**
 * PostgreSQL connection string for OAuth persistence.
 * Falls back to undefined — triggers in-memory mode (tests / local dev without DB).
 */
export function getMcpDbUrl(): string | undefined {
  return (
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.PRICEWATCHA_MCP_DB_URL?.trim() ||
    undefined
  );
}

/** Browser client origins allowed for Streamable HTTP (DNS rebinding protection). */
export const DEFAULT_MCP_ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://claude.com",
  "https://chatgpt.com",
  "https://pricewatcha.com",
] as const;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

/**
 * Allowed Origin header values for browser-based MCP clients.
 * Override with comma-separated MCP_ALLOWED_ORIGINS. Missing Origin is not checked here.
 */
export function getMcpAllowedOrigins(): ReadonlySet<string> {
  const raw = process.env.MCP_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return new Set(
      raw
        .split(",")
        .map(normalizeOrigin)
        .filter((entry) => entry.length > 0),
    );
  }
  return new Set(DEFAULT_MCP_ALLOWED_ORIGINS);
}

/** Host header values allowed for Streamable HTTP (DNS rebinding protection). */
export const DEFAULT_MCP_ALLOWED_HOSTS = [
  "mcp.pricewatcha.com",
  "healthcheck.railway.app",
] as const;

function normalizeHostname(hostname: string): string {
  return hostname.trim();
}

/**
 * Allowed Host header hostnames for MCP HTTP requests.
 * Override with comma-separated MCP_ALLOWED_HOSTS (port-agnostic, no scheme).
 */
export function getMcpAllowedHosts(): string[] {
  const raw = process.env.MCP_ALLOWED_HOSTS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map(normalizeHostname)
      .filter((entry) => entry.length > 0);
  }
  return [...DEFAULT_MCP_ALLOWED_HOSTS];
}
