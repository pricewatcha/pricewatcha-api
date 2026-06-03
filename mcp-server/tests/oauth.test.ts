import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import { after, before, describe, it } from "node:test";

import { createHttpApp } from "../src/http-app.js";

function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

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

describe("MCP OAuth", () => {
  let baseUrl: string;
  let issuerHref: string;
  let resourceUrl: string;
  let server: Server;

  before(async () => {
    const port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    issuerHref = new URL(baseUrl).href;
    resourceUrl = issuerHref;
    process.env.PRICEWATCHA_MCP_ISSUER_URL = baseUrl;
    process.env.MCP_OAUTH_ENABLED = "true";

    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, "127.0.0.1", () => resolve());
    });
  });

  after(() => {
    delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
    delete process.env.MCP_OAUTH_ENABLED;
    server?.close();
  });

  it("serves protected resource metadata at root well-known URI", async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.resource, resourceUrl);
    assert.deepEqual(body.authorization_servers, [issuerHref]);
    assert.ok(Array.isArray(body.scopes_supported));
  });

  it("serves authorization server metadata", async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.issuer, issuerHref);
    assert.equal(body.registration_endpoint, `${baseUrl}/register`);
    assert.equal(body.token_endpoint, `${baseUrl}/token`);
    assert.equal(body.authorization_endpoint, `${baseUrl}/authorize`);
  });

  it("serves authorization server metadata from forwarded host when behind a proxy", async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`, {
      headers: {
        Host: "mcp.pricewatcha.com",
        "X-Forwarded-Proto": "https",
        "X-Forwarded-Host": "mcp.pricewatcha.com",
        "X-Forwarded-For": "203.0.113.10",
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.issuer, "https://mcp.pricewatcha.com/");
    assert.equal(body.registration_endpoint, "https://mcp.pricewatcha.com/register");
    assert.equal(body.token_endpoint, "https://mcp.pricewatcha.com/token");
    assert.equal(body.authorization_endpoint, "https://mcp.pricewatcha.com/authorize");
  });

  it("POST / is public even when OAuth is enabled", async () => {
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

  it("GET / returns 405", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 405);
  });

  it("DCR + authorization code flow yields a usable access token", async () => {
    const registerRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "test-client",
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
        token_endpoint_auth_method: "none",
      }),
    });
    assert.equal(registerRes.status, 201);
    const client = (await registerRes.json()) as { client_id: string };

    const { verifier, challenge } = pkcePair();
    const authorizeUrl = new URL(`${baseUrl}/authorize`);
    authorizeUrl.searchParams.set("client_id", client.client_id);
    authorizeUrl.searchParams.set("redirect_uri", "https://claude.ai/api/mcp/auth_callback");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("scope", "mcp:tools offline_access");
    authorizeUrl.searchParams.set("resource", resourceUrl);

    const authorizeRes = await fetch(authorizeUrl, { redirect: "manual" });
    assert.equal(authorizeRes.status, 302);
    const location = authorizeRes.headers.get("location");
    assert.ok(location);
    const callback = new URL(location);
    const code = callback.searchParams.get("code");
    assert.ok(code);

    const tokenRes = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: client.client_id,
        code,
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        code_verifier: verifier,
        resource: resourceUrl,
      }),
    });
    assert.equal(tokenRes.status, 200);
    const tokens = (await tokenRes.json()) as { access_token: string; refresh_token?: string };
    assert.ok(tokens.access_token);
    assert.ok(tokens.refresh_token);

    const mcpRes = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
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
    assert.notEqual(mcpRes.status, 401);
  });
});
