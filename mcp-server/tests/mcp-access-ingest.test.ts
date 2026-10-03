import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reportMcpAccessEvent } from "../src/utils/mcp-access-ingest.js";

describe("mcp-access-ingest", () => {
  it("POSTs to /api/v1/mcp-access with proxy secret and origin", async () => {
    process.env.PRICEWATCHA_MCP_PROXY_SECRET = "test-secret";
    // Production shape: base already includes /api/v1 (see docs/canonical-host.md).
    process.env.PRICEWATCHA_API_BASE_URL = "https://pricewatcha.com/api/v1";

    const calls: Array<{ url: string; init: Record<string, unknown> }> = [];
    const fetchImpl = async (url: string, init?: Record<string, unknown>) => {
      calls.push({ url, init: init || {} });
      return { ok: true, status: 204 };
    };

    reportMcpAccessEvent(
      {
        rpc: "tools/list",
        status_code: 200,
        client_id: "tok_abc",
        client_origin: "https://mcpbeat.com",
        path: "/",
      },
      fetchImpl as never,
    );

    // Allow the fire-and-forget promise to schedule.
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://pricewatcha.com/api/v1/mcp-access");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers["X-Pricewatcha-Proxy-Secret"], "test-secret");
    assert.equal(headers["X-Pricewatcha-Client-Id"], "tok_abc");
    assert.equal(headers["X-Pricewatcha-Client-Origin"], "https://mcpbeat.com");
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.rpc, "tools/list");
    assert.equal(body.client_origin, "https://mcpbeat.com");
    assert.equal(body.status_code, 200);

    delete process.env.PRICEWATCHA_MCP_PROXY_SECRET;
    delete process.env.PRICEWATCHA_API_BASE_URL;
  });

  it("no-ops when proxy secret is unset", async () => {
    delete process.env.PRICEWATCHA_MCP_PROXY_SECRET;
    delete process.env.API_V1_MCP_PROXY_SECRET;

    const calls: unknown[] = [];
    reportMcpAccessEvent(
      {
        rpc: "tools/list",
        status_code: 200,
        client_id: "tok_abc",
      },
      (async (...args: unknown[]) => {
        calls.push(args);
        return { ok: true, status: 204 };
      }) as never,
    );
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(calls.length, 0);
  });
});
