import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

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

describe("MCP header normalization", () => {
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

  it("accepts initialize with Accept: */*", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: INITIALIZE_BODY,
    });
    assert.notEqual(res.status, 406);
    assert.equal(res.status, 200);
  });

  it("accepts initialize with Accept: application/json only", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: INITIALIZE_BODY,
    });
    assert.notEqual(res.status, 406);
    assert.equal(res.status, 200);
  });

  it("accepts initialize with Content-Type: text/octet-stream", async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "text/octet-stream",
        Accept: "application/json, text/event-stream",
      },
      body: INITIALIZE_BODY,
    });
    assert.notEqual(res.status, 400);
    assert.equal(res.status, 200);
  });
});
