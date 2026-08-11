import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_MCP_ALLOWED_HOSTS,
  DEFAULT_MCP_ALLOWED_ORIGINS,
  getDefaultWaitSeconds,
  getMcpAllowedHosts,
  getMcpAllowedOrigins,
  getMcpIssuerUrl,
  getMcpProxySecret,
  getMcpResourceUrl,
  isOAuthEnabled,
} from "../src/config.js";

describe("config", () => {
  it("getDefaultWaitSeconds respects PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS", () => {
    const prev = process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS;
    try {
      process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS = "45";
      assert.equal(getDefaultWaitSeconds(), 45);
      delete process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS;
      assert.equal(getDefaultWaitSeconds(), 180);
    } finally {
      if (prev === undefined) delete process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS;
      else process.env.PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS = prev;
    }
  });

  it("isOAuthEnabled is false by default and only true when MCP_OAUTH_ENABLED=true", () => {
    const prevIssuer = process.env.PRICEWATCHA_MCP_ISSUER_URL;
    const prevEnabled = process.env.MCP_OAUTH_ENABLED;
    try {
      delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
      delete process.env.MCP_OAUTH_ENABLED;
      assert.equal(isOAuthEnabled(), false);

      process.env.PRICEWATCHA_MCP_ISSUER_URL = "https://mcp.example.com";
      assert.equal(isOAuthEnabled(), false);

      process.env.MCP_OAUTH_ENABLED = "true";
      assert.equal(isOAuthEnabled(), true);

      process.env.MCP_OAUTH_ENABLED = "false";
      assert.equal(isOAuthEnabled(), false);
    } finally {
      if (prevIssuer === undefined) delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
      else process.env.PRICEWATCHA_MCP_ISSUER_URL = prevIssuer;
      if (prevEnabled === undefined) delete process.env.MCP_OAUTH_ENABLED;
      else process.env.MCP_OAUTH_ENABLED = prevEnabled;
    }
  });

  it("getMcpIssuerUrl strips trailing slash", () => {
    const prev = process.env.PRICEWATCHA_MCP_ISSUER_URL;
    try {
      process.env.PRICEWATCHA_MCP_ISSUER_URL = "https://mcp.example.com/";
      assert.equal(getMcpIssuerUrl()?.href, "https://mcp.example.com/");
    } finally {
      if (prev === undefined) delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
      else process.env.PRICEWATCHA_MCP_ISSUER_URL = prev;
    }
  });

  it("getMcpAllowedOrigins defaults to Claude, ChatGPT, and Pricewatcha", () => {
    const prev = process.env.MCP_ALLOWED_ORIGINS;
    try {
      delete process.env.MCP_ALLOWED_ORIGINS;
      const origins = getMcpAllowedOrigins();
      for (const origin of DEFAULT_MCP_ALLOWED_ORIGINS) {
        assert.ok(origins.has(origin), `missing default origin ${origin}`);
      }
    } finally {
      if (prev === undefined) delete process.env.MCP_ALLOWED_ORIGINS;
      else process.env.MCP_ALLOWED_ORIGINS = prev;
    }
  });

  it("getMcpAllowedHosts defaults to production and Railway healthcheck hosts", () => {
    const prev = process.env.MCP_ALLOWED_HOSTS;
    try {
      delete process.env.MCP_ALLOWED_HOSTS;
      assert.deepEqual(getMcpAllowedHosts(), [...DEFAULT_MCP_ALLOWED_HOSTS]);
    } finally {
      if (prev === undefined) delete process.env.MCP_ALLOWED_HOSTS;
      else process.env.MCP_ALLOWED_HOSTS = prev;
    }
  });

  it("getMcpAllowedHosts parses MCP_ALLOWED_HOSTS", () => {
    const prev = process.env.MCP_ALLOWED_HOSTS;
    try {
      process.env.MCP_ALLOWED_HOSTS = "mcp.pricewatcha.com, health.railway.internal ";
      assert.deepEqual(getMcpAllowedHosts(), [
        "mcp.pricewatcha.com",
        "health.railway.internal",
      ]);
    } finally {
      if (prev === undefined) delete process.env.MCP_ALLOWED_HOSTS;
      else process.env.MCP_ALLOWED_HOSTS = prev;
    }
  });

  it("getMcpAllowedOrigins parses MCP_ALLOWED_ORIGINS", () => {
    const prev = process.env.MCP_ALLOWED_ORIGINS;
    try {
      process.env.MCP_ALLOWED_ORIGINS = "https://a.example/, https://b.example";
      assert.deepEqual([...getMcpAllowedOrigins()], [
        "https://a.example",
        "https://b.example",
      ]);
    } finally {
      if (prev === undefined) delete process.env.MCP_ALLOWED_ORIGINS;
      else process.env.MCP_ALLOWED_ORIGINS = prev;
    }
  });

  it("getMcpResourceUrl matches issuer origin", () => {
    const prev = process.env.PRICEWATCHA_MCP_ISSUER_URL;
    try {
      process.env.PRICEWATCHA_MCP_ISSUER_URL = "https://mcp.example.com";
      assert.equal(getMcpResourceUrl()?.href, "https://mcp.example.com/");
    } finally {
      if (prev === undefined) delete process.env.PRICEWATCHA_MCP_ISSUER_URL;
      else process.env.PRICEWATCHA_MCP_ISSUER_URL = prev;
    }
  });

  it("getMcpProxySecret reads PRICEWATCHA_MCP_PROXY_SECRET", () => {
    const prevA = process.env.PRICEWATCHA_MCP_PROXY_SECRET;
    const prevB = process.env.API_V1_MCP_PROXY_SECRET;
    try {
      delete process.env.PRICEWATCHA_MCP_PROXY_SECRET;
      delete process.env.API_V1_MCP_PROXY_SECRET;
      assert.equal(getMcpProxySecret(), undefined);
      process.env.PRICEWATCHA_MCP_PROXY_SECRET = " shared ";
      assert.equal(getMcpProxySecret(), "shared");
    } finally {
      if (prevA === undefined) delete process.env.PRICEWATCHA_MCP_PROXY_SECRET;
      else process.env.PRICEWATCHA_MCP_PROXY_SECRET = prevA;
      if (prevB === undefined) delete process.env.API_V1_MCP_PROXY_SECRET;
      else process.env.API_V1_MCP_PROXY_SECRET = prevB;
    }
  });
});
