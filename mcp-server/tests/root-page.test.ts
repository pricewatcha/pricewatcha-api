import assert from "node:assert/strict";
import http from "node:http";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

function httpGet(
  port: number,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; contentType: string; body: string }> {
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
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            contentType: String(res.headers["content-type"] ?? ""),
            body,
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("root page routes", () => {
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

  it("serves GET / as 200 text/html with favicon link tags", async () => {
    const res = await httpGet(port, "/");
    assert.equal(res.status, 200);
    assert.match(res.contentType, /^text\/html/);
    assert.match(res.body, /<link rel="icon" href="\/favicon\.ico">/);
    assert.match(res.body, /<link rel="icon" type="image\/png" sizes="64x64" href="\/favicon-64\.png">/);
    assert.match(res.body, /<title>Pricewatcha MCP<\/title>/);
    assert.match(res.body, /href="https:\/\/pricewatcha\.com"/);
    assert.match(res.body, /href="https:\/\/pricewatcha\.com\/en\/developers"/);
    assert.match(
      res.body,
      /href="https:\/\/pricewatcha\.com\/en\/pricewatcha-in-claude-and-chatgpt"/,
    );
  });

  it("allows GET / with disallowed Host and Origin (public page)", async () => {
    const res = await httpGet(port, "/", {
      Host: "evil.example",
      Origin: "https://evil.example",
    });
    assert.equal(res.status, 200);
    assert.match(res.contentType, /^text\/html/);
  });

  it("serves GET /robots.txt that allows crawling", async () => {
    const res = await httpGet(port, "/robots.txt");
    assert.equal(res.status, 200);
    assert.match(res.contentType, /^text\/plain/);
    assert.match(res.body, /User-agent:\s*\*/i);
    assert.match(res.body, /Allow:\s*\//i);
    assert.doesNotMatch(res.body, /Disallow:/i);
  });

  it("leaves POST / unchanged for MCP transport", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
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
    assert.notEqual(res.status, 405);
  });
});
