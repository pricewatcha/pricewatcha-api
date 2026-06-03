import express, { type Express, type Request, type Response } from "express";
import type { Pool } from "pg";
import {
  createOAuthMetadata,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";

import {
  getMcpDbUrl,
  getMcpIssuerUrl,
  getMcpResourceUrl,
  isOAuthEnabled,
  MCP_OAUTH_SCOPES,
} from "../config.js";
import { createPool, ensureSchema } from "../db.js";
import { getMcpResourceUrlFromRequest, getPublicOriginFromRequest } from "../utils/public-origin.js";
import { createOAuthProvider } from "./provider.js";

let oauthProvider: ReturnType<typeof createOAuthProvider> | null = null;
let dbPool: Pool | undefined;

const SERVICE_DOCS_URL = "https://pricewatcha.com/en/developers";

/** OAuth HTTP surface — hidden with 404 when MCP_OAUTH_ENABLED is not true. */
const OAUTH_HTTP_PATHS = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/authorize",
  "/token",
  "/register",
  "/revoke",
] as const;

function mountOAuthDisabledRoutes(app: Express): void {
  for (const path of OAUTH_HTTP_PATHS) {
    app.all(path, (_req: Request, res: Response) => {
      res.status(404).end();
    });
  }
}

export function getOAuthProvider(): ReturnType<typeof createOAuthProvider> | null {
  return oauthProvider;
}

export function getDbPool(): Pool | undefined {
  return dbPool;
}

export async function initOAuthDb(): Promise<void> {
  const dbUrl = getMcpDbUrl();
  if (!dbUrl) {
    console.warn(
      "SUPABASE_DB_URL / PRICEWATCHA_MCP_DB_URL not set — " +
        "OAuth using in-memory store (data lost on restart)",
    );
    return;
  }

  dbPool = createPool(dbUrl);
  await ensureSchema(dbPool);
  console.log("OAuth DB initialized (PostgreSQL)");
}

function mountDynamicOAuthMetadata(app: Express, provider: NonNullable<typeof oauthProvider>): void {
  const scopes = [...MCP_OAUTH_SCOPES];

  app.get("/.well-known/oauth-authorization-server", (req: Request, res: Response) => {
    try {
      const origin = getPublicOriginFromRequest(req);
      const metadata = createOAuthMetadata({
        provider,
        issuerUrl: origin,
        baseUrl: origin,
        scopesSupported: scopes,
        serviceDocumentationUrl: new URL(SERVICE_DOCS_URL),
      });
      res.json(metadata);
    } catch (error) {
      res.status(400).json({
        error: "invalid_request",
        error_description: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/.well-known/oauth-protected-resource", (req: Request, res: Response) => {
    try {
      const origin = getPublicOriginFromRequest(req);
      const resourceUrl = getMcpResourceUrlFromRequest(req);
      res.json({
        resource: resourceUrl.href,
        authorization_servers: [origin.href],
        scopes_supported: scopes,
        resource_name: "Pricewatcha MCP",
        resource_documentation: SERVICE_DOCS_URL,
      });
    } catch (error) {
      res.status(400).json({
        error: "invalid_request",
        error_description: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export function mountOAuthRoutes(app: Express): void {
  if (!isOAuthEnabled()) {
    mountOAuthDisabledRoutes(app);
    return;
  }

  const configuredIssuer = getMcpIssuerUrl();
  const configuredResource = getMcpResourceUrl();
  if (!configuredIssuer || !configuredResource) {
    return;
  }

  oauthProvider = createOAuthProvider(true, dbPool);
  app.use(express.urlencoded({ extended: false }));

  mountDynamicOAuthMetadata(app, oauthProvider);

  app.use(
    mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl: configuredIssuer,
      resourceServerUrl: configuredResource,
      scopesSupported: [...MCP_OAUTH_SCOPES],
      resourceName: "Pricewatcha MCP",
      serviceDocumentationUrl: new URL(SERVICE_DOCS_URL),
    }),
  );
}
