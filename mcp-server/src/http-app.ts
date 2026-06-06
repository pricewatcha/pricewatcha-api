import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, Request, Response } from "express";

import { createOriginValidationMiddleware } from "./middleware/origin-validation.js";
import { getDbPool, mountOAuthRoutes } from "./oauth/setup.js";
import { createServer } from "./server.js";

async function handleMcpPost(req: Request, res: Response): Promise<void> {
  const server = createServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}

export function createHttpApp(): Express {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.set("trust proxy", 1);
  app.use(createOriginValidationMiddleware());
  mountOAuthRoutes(app);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "pricewatcha-mcp" });
  });

  app.get("/", (_req: Request, res: Response) => {
    res.status(405).json({ error: "method_not_allowed", message: "Use POST for MCP requests" });
  });

  app.post("/", (req: Request, res: Response) => {
    void handleMcpPost(req, res);
  });

  const cleanupInterval = setInterval(() => {
    const pool = getDbPool();
    if (!pool) {
      return;
    }
    void pool
      .query(`
        DELETE FROM oauth_authorization_codes WHERE expires_at < NOW();
        DELETE FROM oauth_tokens
          WHERE expires_at < NOW()
            AND (refresh_expires_at IS NULL OR refresh_expires_at < NOW());
      `)
      .catch((err: unknown) => {
        console.error("OAuth cleanup failed:", err);
      });
  }, 15 * 60 * 1000);
  cleanupInterval.unref();

  return app;
}
