import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import type { Request } from "express";

import {
  deriveMcpClientId,
  getMcpRequestClientId,
  runWithMcpRequestContext,
} from "../src/utils/request-context.js";

function mockRequest(partial: {
  authorization?: string;
  ip?: string;
  remoteAddress?: string;
}): Request {
  return {
    headers: partial.authorization
      ? { authorization: partial.authorization }
      : {},
    ip: partial.ip,
    socket: { remoteAddress: partial.remoteAddress },
  } as unknown as Request;
}

describe("deriveMcpClientId", () => {
  it("hashes bearer tokens stably", () => {
    const token = "access-token-xyz";
    const expected =
      "tok_" + createHash("sha256").update(token).digest("hex").slice(0, 32);
    assert.equal(
      deriveMcpClientId(mockRequest({ authorization: `Bearer ${token}` })),
      expected,
    );
    assert.equal(
      deriveMcpClientId(mockRequest({ authorization: `bearer ${token}` })),
      expected,
    );
  });

  it("falls back to hashed connecting IP", () => {
    const ip = "198.51.100.20";
    const expected =
      "ip_" + createHash("sha256").update(ip).digest("hex").slice(0, 32);
    assert.equal(deriveMcpClientId(mockRequest({ ip })), expected);
  });
});

describe("mcpRequestContext", () => {
  it("exposes client id inside runWithMcpRequestContext", async () => {
    assert.equal(getMcpRequestClientId(), undefined);
    await runWithMcpRequestContext({ clientId: "tok_abc" }, async () => {
      assert.equal(getMcpRequestClientId(), "tok_abc");
    });
    assert.equal(getMcpRequestClientId(), undefined);
  });
});
