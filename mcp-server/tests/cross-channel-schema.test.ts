import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JobResponse } from "@pricewatcha/sdk";

import {
  formatJobStatusResult,
  formatTrackProductResult,
  MCP_TRACK_RUNNING_HINT,
} from "../src/utils/job-result.js";

const JOB_STATUS_FIELDS = ["job_id", "status", "product", "error"] as const;

describe("cross-channel JobStatusResponse schema", () => {
  it("MCP formatter exposes the shared job status fields", () => {
    const job: JobResponse = {
      job_id: "job_abc",
      status: "completed",
      product: {
        product_id: "prod_x",
        name: "Phone",
        shop: "Back Market",
        product_url: "https://example.com/p/1",
        currency: "EUR",
        current_price: 500,
        status: "active",
        last_checked_at: "2026-05-22T17:36:58.972027Z",
      },
      error: null,
    };

    const formatted = formatJobStatusResult(job);
    for (const field of JOB_STATUS_FIELDS) {
      assert.ok(field in formatted, `missing ${field}`);
    }
    assert.equal(formatted.product, job.product);
    assert.equal(formatted.error, null);
  });

  it("passes through optional hint for get_job_status", () => {
    const formatted = formatJobStatusResult({
      job_id: "job_slow",
      status: "running",
      product: null,
      error: null,
      hint: "Job still running. Poll GET /api/v1/jobs/{jobId}.",
    });
    assert.equal(formatted.hint, "Job still running. Poll GET /api/v1/jobs/{jobId}.");
  });

  it("rewrites running hint for track_product MCP callers", () => {
    const formatted = formatTrackProductResult({
      job_id: "job_slow",
      status: "running",
      product: null,
      error: null,
      hint: "Job still running. Poll GET /api/v1/jobs/{jobId}.",
    });
    assert.equal(formatted.hint, MCP_TRACK_RUNNING_HINT);
    assert.doesNotMatch(String(formatted.hint), /GET \/api\/v1\/jobs/);
  });

  it("does not add hint when track_product running response has no hint", () => {
    const formatted = formatTrackProductResult({
      job_id: "job_slow",
      status: "running",
      product: null,
      error: null,
    });
    assert.equal("hint" in formatted, false);
  });

  it("does not rewrite hint for completed track_product responses", () => {
    const formatted = formatTrackProductResult({
      job_id: "job_done",
      status: "completed",
      product: null,
      error: null,
      hint: "unexpected hint",
    });
    assert.equal(formatted.hint, "unexpected hint");
  });
});
