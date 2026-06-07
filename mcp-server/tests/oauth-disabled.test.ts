import assert from "node:assert/strict";
import type { Server } from "node:http";
import express from "express";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

const OAUTH_PATHS = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/authorize",
  "/token",
  "/register",
  "/revoke",
] as const;

async function reservePort(): Promise<number> {
  const probe = express();
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const s = probe.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const port = addr.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

describe("MCP OAuth disabled (default)", () => {
  let baseUrl: string;
  let server: Server;

  before(async () => {
    const port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    process.env.PRICEWATCHA_MCP_ISSUER_URL = baseUrl;
    delete process.env.MCP_OAUTH_ENABLED;
    process.env.MCP_ALLOWED_HOSTS = "127.0.0.1,localhost";

    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, "127.0.0.1", () => resolve());
    });
  });

  after(() => {
    delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
    delete process.env.MCP_OAUTH_ENABLED;
    delete process.env.MCP_ALLOWED_HOSTS;
    server?.close();
  });

  for (const path of OAUTH_PATHS) {
    it(`GET ${path} returns 404`, async () => {
      const res = await fetch(`${baseUrl}${path}`);
      assert.equal(res.status, 404);
    });
  }

  it("POST /register returns 404", async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: "blocked" }),
    });
    assert.equal(res.status, 404);
  });

  it("POST / works without Bearer (public MCP)", async () => {
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
  });
});

describe("MCP OAuth explicitly disabled", () => {
  let baseUrl: string;
  let server: Server;

  before(async () => {
    const port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    process.env.PRICEWATCHA_MCP_ISSUER_URL = baseUrl;
    process.env.MCP_OAUTH_ENABLED = "false";
    process.env.MCP_ALLOWED_HOSTS = "127.0.0.1,localhost";

    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, "127.0.0.1", () => resolve());
    });
  });

  after(() => {
    delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
    delete process.env.MCP_OAUTH_ENABLED;
    delete process.env.MCP_ALLOWED_HOSTS;
    server?.close();
  });

  it("GET /.well-known/oauth-authorization-server returns 404", async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
    assert.equal(res.status, 404);
  });
});
