#!/usr/bin/env node
/**
 * Pricewatcha MCP Server — Streamable HTTP transport for remote clients (Railway, etc.).
 */

import { createHttpApp } from "./http-app.js";
import { validateHttpProductionConfig } from "./config.js";
import { initOAuthDb } from "./oauth/setup.js";
import { getApiBaseUrl } from "./utils/client.js";

async function probeApiOnStartup(): Promise<void> {
  const base = getApiBaseUrl();
  try {
    const { getClient } = await import("./utils/client.js");
    await getClient().health();
    console.log(`Pricewatcha MCP HTTP server (API: ${base} — health OK)`);
  } catch {
    console.warn(`Pricewatcha MCP HTTP server (API: ${base} — health check failed)`);
  }
}

async function main(): Promise<void> {
  process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS ??= "60";
  validateHttpProductionConfig();

  await initOAuthDb();

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const app = createHttpApp();

  app.listen(port, () => {
    console.log(`Pricewatcha MCP HTTP listening on port ${port}`);
    void probeApiOnStartup();
  });
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
