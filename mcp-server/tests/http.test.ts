import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";
import { MCP_TOOL_NAMES, createServer } from "../src/server.js";

describe("HTTP MCP server", () => {
  let baseUrl: string;
  let server: Server;

  before(async () => {
    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(() => {
    server?.close();
  });

  it("GET /health returns ok without auth", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, string>;
    assert.equal(body.status, "ok");
    assert.equal(body.service, "pricewatcha-mcp");
  });

  it("POST / is public without Bearer token", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const res = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
          id: 1,
        }),
      });
      assert.notEqual(res.status, 401);
      assert.notEqual(res.status, 404);
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
    }
  });
});

describe("createServer", () => {
  it("registers all 6 tools", () => {
    const server = createServer();
    assert.ok(server);
    assert.equal(MCP_TOOL_NAMES.length, 6);
    assert.deepEqual([...MCP_TOOL_NAMES], [
      "get_api_status",
      "track_product",
      "get_job_status",
      "get_product",
      "get_price_history",
      "search_products",
    ]);
  });
});
