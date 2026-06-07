import assert from "node:assert/strict";
import http from "node:http";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

function httpGet(
  port: number,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; contentType: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            contentType: String(res.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("favicon routes", () => {
  let port: number;
  let server: Server;
  const prevHosts = process.env.MCP_ALLOWED_HOSTS;
  const prevOrigins = process.env.MCP_ALLOWED_ORIGINS;

  before(async () => {
    process.env.MCP_ALLOWED_HOSTS = "mcp.pricewatcha.com";
    process.env.MCP_ALLOWED_ORIGINS = "https://claude.ai";
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
    if (prevOrigins === undefined) delete process.env.MCP_ALLOWED_ORIGINS;
    else process.env.MCP_ALLOWED_ORIGINS = prevOrigins;
  });

  it("serves /favicon.ico without Host or Origin headers", async () => {
    const res = await httpGet(port, "/favicon.ico");
    assert.equal(res.status, 200);
    assert.match(res.contentType, /image\/(x-icon|vnd\.microsoft\.icon)/);
    assert.ok(res.body.length > 100);
    assert.equal(res.body.readUInt16LE(0), 0); // ICO magic
    assert.equal(res.body.readUInt16LE(2), 1);
    assert.notEqual(res.body.indexOf(Buffer.from("\x89PNG\r\n\x1a\n")), 0); // BMP ICO, not PNG-in-ICO
  });

  it("serves /favicon-64.png as a 64x64 PNG", async () => {
    const res = await httpGet(port, "/favicon-64.png");
    assert.equal(res.status, 200);
    assert.equal(res.contentType, "image/png");
    const width = res.body.readUInt32BE(16);
    const height = res.body.readUInt32BE(20);
    assert.equal(width, 64);
    assert.equal(height, 64);
  });

  it("allows favicon fetch with disallowed Host and Origin (public asset)", async () => {
    const res = await httpGet(port, "/favicon.ico", {
      Host: "evil.example",
      Origin: "https://evil.example",
    });
    assert.equal(res.status, 200);
  });
});
