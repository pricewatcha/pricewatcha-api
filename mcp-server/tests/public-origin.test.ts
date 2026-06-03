import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getMcpResourceUrlFromRequest, getPublicOriginFromRequest } from "../src/utils/public-origin.js";

function mockRequest(headers: Record<string, string>, protocol = "http"): {
  get(name: string): string | undefined;
  protocol: string;
} {
  return {
    get(name: string) {
      return headers[name.toLowerCase()] ?? headers[name];
    },
    protocol,
  };
}

describe("public-origin", () => {
  it("derives origin from Host header", () => {
    const origin = getPublicOriginFromRequest(
      mockRequest({ host: "mcp.pricewatcha.com" }, "https") as never,
    );
    assert.equal(origin.href, "https://mcp.pricewatcha.com/");
  });

  it("prefers X-Forwarded-* headers for proxy deployments", () => {
    const origin = getPublicOriginFromRequest(
      mockRequest(
        {
          host: "127.0.0.1:3000",
          "x-forwarded-host": "mcp.pricewatcha.com",
          "x-forwarded-proto": "https",
        },
        "http",
      ) as never,
    );
    assert.equal(origin.href, "https://mcp.pricewatcha.com/");
  });

  it("builds MCP resource URL from request origin", () => {
    const resource = getMcpResourceUrlFromRequest(
      mockRequest({ host: "mcp.pricewatcha.com" }, "https") as never,
    );
    assert.equal(resource.href, "https://mcp.pricewatcha.com/");
  });
});
