#!/usr/bin/env node
/**
 * Pricewatcha MCP Server — Streamable HTTP transport for remote clients (Railway, etc.).
 */

import { createHttpApp } from "./http-app.js";
import { validateHttpProductionConfig } from "./config.js";
import { initOAuthDb } from "./oauth/setup.js";
import { getApiBaseUrl } from "./utils/client.js";

/** Dual-stack bind address (Railway health probes may use IPv6). */
const LISTEN_HOST = "::";

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

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);

  // OAuth routes bind to dbPool at startup — initialize DB before createHttpApp().
  await initOAuthDb();

  const app = createHttpApp();

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, LISTEN_HOST, () => resolve());
    server.on("error", reject);
  });
  console.log(
    `Pricewatcha MCP HTTP listening on [${LISTEN_HOST}]:${port} (PORT=${process.env.PORT ?? "unset"})`,
  );

  void probeApiOnStartup();
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
