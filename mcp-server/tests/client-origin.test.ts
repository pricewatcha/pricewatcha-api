import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeClientOrigin,
  originFromUserAgent,
  resolveClientOrigin,
} from "../src/utils/client-origin.js";

describe("client-origin", () => {
  it("normalizes full URLs to scheme://host", () => {
    assert.equal(
      normalizeClientOrigin("https://mcpbeat.com/bot/;liveness"),
      "https://mcpbeat.com",
    );
    assert.equal(normalizeClientOrigin("https://claude.ai"), "https://claude.ai");
    assert.equal(normalizeClientOrigin("-"), undefined);
    assert.equal(normalizeClientOrigin(""), undefined);
  });

  it("extracts URL from mcpbeat-style User-Agent", () => {
    assert.equal(
      originFromUserAgent(
        "mcpbeat/0.1 (+https://mcpbeat.com/bot/; liveness check)",
      ),
      "https://mcpbeat.com",
    );
  });

  it("prefers Origin over User-Agent URL", () => {
    assert.equal(
      resolveClientOrigin({
        origin: "https://claude.ai",
        userAgent: "mcpbeat/0.1 (+https://mcpbeat.com/bot/)",
      }),
      "https://claude.ai",
    );
  });

  it("falls back to Referer when Origin and UA have no site", () => {
    assert.equal(
      resolveClientOrigin({
        origin: undefined,
        userAgent: "curl/8.0",
        referer: "https://chatgpt.com/c/abc",
      }),
      "https://chatgpt.com",
    );
  });
});
