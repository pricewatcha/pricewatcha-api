import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDefaultWaitSeconds,
  getMcpIssuerUrl,
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
});
