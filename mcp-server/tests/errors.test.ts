import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PricewatchaAPIError, type ApiErrorBody } from "@pricewatcha/sdk";

import { buildStructuredToolError, handleToolError } from "../src/utils/errors.js";

const JOB_NOT_FOUND_BODY = {
  code: "job_not_found",
  message: "Job 'job_AAAAAAAAAAAAAAAA' does not exist. Jobs are retained for 72h after creation.",
  http_status: 404,
  retry_recommended: false,
  retry_after_seconds: null,
};

function parseToolPayload(result: ReturnType<typeof handleToolError>): Record<string, unknown> {
  return JSON.parse(result.content[0]?.text ?? "{}") as Record<string, unknown>;
}

describe("MCP structured error pass-through", () => {
  it("passes get_product 404 errors through verbatim", () => {
    const result = handleToolError(
      new PricewatchaAPIError("Product missing", {
        statusCode: 404,
        errorBody: {
          code: "product_not_found",
          message: "Product 'prod_nonexistent_xxxxxxxxxxxx' does not exist.",
          http_status: 404,
          retry_recommended: false,
          retry_after_seconds: null,
        },
      }),
    );
    const payload = parseToolPayload(result);
    assert.deepEqual(payload.error, {
      code: "product_not_found",
      message: "Product 'prod_nonexistent_xxxxxxxxxxxx' does not exist.",
      http_status: 404,
      retry_recommended: false,
      retry_after_seconds: null,
    });
    assert.equal(payload.api_base_url, undefined);
    assert.doesNotMatch(JSON.stringify(payload), /PRICEWATCHA_API_BASE_URL/);
    assert.doesNotMatch(JSON.stringify(payload), /API v1 may not be deployed/);
  });

  it("passes get_job_status 400 errors through verbatim", () => {
    const result = handleToolError(
      new PricewatchaAPIError("Invalid job id", {
        statusCode: 400,
        errorBody: {
          code: "invalid_input_format",
          message: "job_id must match job_<token>",
          http_status: 400,
          retry_recommended: false,
          retry_after_seconds: null,
        },
      }),
    );
    const payload = parseToolPayload(result);
    assert.deepEqual(payload.error, {
      code: "invalid_input_format",
      message: "job_id must match job_<token>",
      http_status: 400,
      retry_recommended: false,
      retry_after_seconds: null,
    });
    assert.equal(payload.api_base_url, undefined);
  });

  it("recovers structured errors from legacy stringified JSON messages", () => {
    const legacyMessage =
      `${JSON.stringify({ error: JOB_NOT_FOUND_BODY })} — HTTP 404 — Requested base URL: https://example.up.railway.app/api/v1 — API v1 may not be deployed on this host yet.`;

    const structured = buildStructuredToolError(
      new PricewatchaAPIError(legacyMessage, { statusCode: 404 }),
    );

    assert.deepEqual(structured, JOB_NOT_FOUND_BODY);
  });

  it("returns fallback shape for non-JSON upstream responses (502 HTML)", () => {
    const result = handleToolError(
      new PricewatchaAPIError("<html><body>Bad Gateway</body></html>", {
        statusCode: 502,
      }),
    );
    const payload = parseToolPayload(result);
    const error = payload.error as ApiErrorBody;
    assert.equal(error.code, "internal_error");
    assert.equal(error.message, "Unexpected upstream response (status 502)");
    assert.equal(error.http_status, 502);
    assert.equal(error.retry_recommended, true);
    assert.equal(error.retry_after_seconds, null);
    assert.equal(payload.api_base_url, undefined);
  });

  it("includes api_base_url only when PRICEWATCHA_MCP_DEBUG=1", () => {
    const prev = process.env.PRICEWATCHA_MCP_DEBUG;
    process.env.PRICEWATCHA_MCP_DEBUG = "1";
    try {
      const result = handleToolError(
        new PricewatchaAPIError("missing", {
          statusCode: 404,
          errorBody: JOB_NOT_FOUND_BODY,
        }),
      );
      const payload = parseToolPayload(result);
      assert.equal(typeof payload.api_base_url, "string");
    } finally {
      if (prev === undefined) delete process.env.PRICEWATCHA_MCP_DEBUG;
      else process.env.PRICEWATCHA_MCP_DEBUG = prev;
    }
  });
});
