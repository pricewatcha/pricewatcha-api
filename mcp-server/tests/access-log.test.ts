import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";
import { createAccessLogMiddleware } from "../src/middleware/access-log.js";

const INITIALIZE_BODY = JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  },
  id: 1,
});

describe("access log middleware", () => {
  it("logs method, path, status, rpc method, and omits bearer token", () => {
    const lines: string[] = [];
    const middleware = createAccessLogMiddleware((line) => lines.push(line));

    const req = {
      method: "POST",
      path: "/mcp",
      headers: {
        origin: "https://platform.openai.com",
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        authorization: "Bearer super-secret-token",
        "user-agent": "OpenAI-Scan/1.0",
      },
      body: { jsonrpc: "2.0", method: "tools/list", id: 2 },
    };
    const listeners: Record<string, Array<() => void>> = {};
    const res = {
      statusCode: 200,
      on(event: string, cb: () => void) {
        (listeners[event] ??= []).push(cb);
      },
    };

    let nextCalled = false;
    middleware(req as never, res as never, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(lines.length, 0);

    for (const cb of listeners.finish ?? []) {
      cb();
    }

    assert.equal(lines.length, 1);
    assert.match(lines[0], /^access POST \/mcp status=200 \d+ms /);
    assert.match(lines[0], /auth=bearer/);
    assert.match(lines[0], /origin=https:\/\/platform\.openai\.com/);
    assert.match(lines[0], /rpc=tools\/list/);
    assert.doesNotMatch(lines[0], /super-secret-token/);
  });

  it("skips /health probe noise", () => {
    const lines: string[] = [];
    const middleware = createAccessLogMiddleware((line) => lines.push(line));
    const res = {
      statusCode: 200,
      on() {
        /* unused */
      },
    };
    middleware(
      { method: "GET", path: "/health", headers: {}, body: undefined } as never,
      res as never,
      () => undefined,
    );
    assert.equal(lines.length, 0);
  });
});

describe("access log via HTTP app", () => {
  let baseUrl: string;
  let server: Server;
  let originalLog: typeof console.log;
  let lines: string[];

  before(async () => {
    process.env.MCP_ALLOWED_HOSTS = "127.0.0.1,localhost";
    lines = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      const text = args.map(String).join(" ");
      if (text.startsWith("access ")) {
        lines.push(text);
      }
      originalLog(...args);
    };
    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(() => {
    console.log = originalLog;
    server?.close();
  });

  it("emits an access line for MCP initialize", async () => {
    lines.length = 0;
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Origin: "https://chatgpt.com",
      },
      body: INITIALIZE_BODY,
    });
    assert.equal(res.status, 200);
    // finish may fire slightly after response body is consumed
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(
      lines.some((line) => line.includes("POST /") && line.includes("rpc=initialize")),
      `expected initialize access log, got: ${JSON.stringify(lines)}`,
    );
  });
});
