import assert from "node:assert/strict";
import http from "node:http";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

function httpGetWithHost(
  port: number,
  hostHeader: string,
  path: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: { Host: hostHeader },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("Host header validation", () => {
  let port: number;
  let server: Server;
  const prevHosts = process.env.MCP_ALLOWED_HOSTS;

  before(async () => {
    process.env.MCP_ALLOWED_HOSTS = "mcp.pricewatcha.com,healthcheck.railway.app";
    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    port = addr.port;
  });

  after(() => {
    server?.close();
    if (prevHosts === undefined) delete process.env.MCP_ALLOWED_HOSTS;
    else process.env.MCP_ALLOWED_HOSTS = prevHosts;
  });

  it("allows requests with an allowlisted Host header", async () => {
    const res = await httpGetWithHost(port, "mcp.pricewatcha.com", "/health");
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body) as { status: string; service: string };
    assert.equal(body.status, "ok");
    assert.equal(body.service, "pricewatcha-mcp");
  });

  it("allows Railway healthcheck Host header", async () => {
    const res = await httpGetWithHost(port, "healthcheck.railway.app", "/health");
    assert.equal(res.status, 200);
  });

  it("allows /health without Host header (platform liveness)", async () => {
    const res = await new Promise<{ status: number }>((resolve, reject) => {
      const req = http.request(
        { hostname: "127.0.0.1", port, path: "/health", method: "GET" },
        (response) => resolve({ status: response.statusCode ?? 0 }),
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(res.status, 200);
  });

  it("allows /health even when Host is not allowlisted", async () => {
    const res = await httpGetWithHost(port, "evil.example", "/health");
    assert.equal(res.status, 200);
  });

  it("rejects MCP routes with HTTP 403 for a disallowed Host header", async () => {
    const res = await httpGetWithHost(port, "evil.example", "/");
    assert.equal(res.status, 403);
    const body = JSON.parse(res.body) as { error: { message: string } };
    assert.match(body.error.message, /Invalid Host: evil\.example/);
  });
});
