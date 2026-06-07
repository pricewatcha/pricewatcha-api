import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

const MCP_POST_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
} as const;

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

describe("Origin header validation", () => {
  let baseUrl: string;
  let server: Server;

  before(async () => {
    process.env.MCP_ALLOWED_HOSTS = "127.0.0.1,localhost";
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

  it("allows POST / when Origin is missing", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: MCP_POST_HEADERS,
      body: INITIALIZE_BODY,
    });
    assert.notEqual(res.status, 403);
  });

  it("allows POST / for an allowlisted browser origin", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        ...MCP_POST_HEADERS,
        Origin: "https://claude.ai",
      },
      body: INITIALIZE_BODY,
    });
    assert.notEqual(res.status, 403);
  });

  it("rejects POST / with HTTP 403 for a disallowed Origin", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        ...MCP_POST_HEADERS,
        Origin: "https://evil.example",
      },
      body: INITIALIZE_BODY,
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as { error: string; message: string };
    assert.equal(body.error, "forbidden");
    assert.equal(body.message, "Origin not allowed");
  });
});
