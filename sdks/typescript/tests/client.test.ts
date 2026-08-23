import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PricewatchaClient } from "../src/client.js";
import { PricewatchaAPIError, PricewatchaTimeoutError } from "../src/errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const COMPLETED_JOB = {
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

describe("PricewatchaClient", () => {
  it("health() returns parsed JSON", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse({ status: "ok", service: "pricewatcha-api", version: "v1" });

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const data = await client.health();
    assert.equal(data.status, "ok");
  });

  it("track() accepts 200 with completed job", async () => {
    const fetchMock: typeof fetch = async (input, init) => {
      assert.equal(init?.method, "POST");
      assert.match(String(input), /\/track$/);
      return jsonResponse(COMPLETED_JOB, 200);
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const job = await client.track("https://www.backmarket.de/de-de/p/example");
    assert.equal(job.status, "completed");
    assert.equal(job.product?.product_id, "prod_x");
  });

  it("track() returns running job with hint on long-poll timeout", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse({
        job_id: "job_slow",
        status: "running",
        product: null,
        error: null,
        hint: "Job still running. Poll get_job_status with this job_id.",
      });

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const job = await client.track("https://www.amazon.de/dp/example");
    assert.equal(job.status, "running");
    assert.ok(job.hint);
  });

  it("getJob() returns failed scrape as HTTP 200 without throwing", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse({
        job_id: "job_abc",
        status: "failed",
        product: null,
        error: {
          code: "scrape_chain_exhausted",
          message: "All scraper layers failed.",
          http_status: null,
          retry_recommended: false,
          retry_after_seconds: null,
        },
      });

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const job = await client.getJob("job_abc");
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "scrape_chain_exhausted");
  });

  it("waitForJob() returns completed job", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse(COMPLETED_JOB);

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const job = await client.waitForJob("job_abc", {
      timeoutMs: 10_000,
      intervalMs: 10,
    });
    assert.equal(job.status, "completed");
  });

  it("waitForJob() throws on failed job", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse({
        job_id: "job_abc",
        status: "failed",
        product: null,
        error: {
          code: "invalid_url",
          message: "Invalid URL",
          http_status: null,
          retry_recommended: false,
          retry_after_seconds: null,
        },
      });

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    await assert.rejects(
      () => client.waitForJob("job_abc", { timeoutMs: 5000, intervalMs: 10 }),
      (err: unknown) => err instanceof PricewatchaAPIError && /Invalid URL/.test(err.message),
    );
  });

  it("waitForJob() throws PricewatchaTimeoutError", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse({ job_id: "job_abc", status: "running", product: null, error: null });

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    await assert.rejects(
      () => client.waitForJob("job_abc", { timeoutMs: 50, intervalMs: 10 }),
      (err: unknown) => err instanceof PricewatchaTimeoutError,
    );
  });

  it("trackAndWait() uses track long-poll then polls getJob", async () => {
    let getCalls = 0;
    const fetchMock: typeof fetch = async (input, init) => {
      if (init?.method === "POST") {
        return jsonResponse({
          job_id: "job_abc",
          status: "running",
          product: null,
          error: null,
        });
      }
      getCalls += 1;
      return jsonResponse(COMPLETED_JOB);
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const job = await client.trackAndWait("https://example.com/p/1", {
      timeoutMs: 5000,
      intervalMs: 10,
    });
    assert.equal(job.status, "completed");
    assert.equal(getCalls, 1);
  });

  it("getJob() raises PricewatchaAPIError on 404", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse({ detail: "Job not found" }, 404);

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    await assert.rejects(
      () => client.getJob("missing"),
      (err: unknown) =>
        err instanceof PricewatchaAPIError &&
        err.statusCode === 404 &&
        /Job not found/.test(err.message),
    );
  });

  it("getJob() parses structured error.code", async () => {
    const fetchMock: typeof fetch = async () =>
      jsonResponse(
        {
          error: {
            code: "job_not_found",
            message: "Job 'job_abc' does not exist.",
            http_status: 404,
            retry_recommended: false,
            retry_after_seconds: null,
          },
        },
        404,
      );

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    await assert.rejects(
      () => client.getJob("job_abc"),
      (err: unknown) =>
        err instanceof PricewatchaAPIError &&
        err.errorCode === "job_not_found" &&
        err.errorBody?.http_status === 404,
    );
  });

  it("apiKey is sent in Authorization header", async () => {
    const fetchMock: typeof fetch = async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), "Bearer pwk_live_test");
      return jsonResponse({ status: "ok", service: "pricewatcha-api", version: "v1" });
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      apiKey: "pwk_live_test",
      fetch: fetchMock,
    });
    await client.health();
  });

  it("createAlert() posts directional flags without thresholds", async () => {
    const fetchMock: typeof fetch = async (input, init) => {
      assert.equal(init?.method, "POST");
      assert.match(String(input), /\/alerts$/);
      assert.deepEqual(JSON.parse(String(init?.body)), {
        product_id: "prod_x",
        notify_on_drop: true,
      });
      return jsonResponse(
        {
          alert_id: 76,
          product_id: "prod_x",
          min_threshold_price: null,
          max_threshold_price: null,
          notify_on_drop: true,
          notify_on_rise: false,
          currency: "EUR",
          webhook_url: null,
          notify_email: true,
          name: null,
          is_active: true,
          created_at: "2026-08-23T10:00:00Z",
          updated_at: "2026-08-23T10:00:00Z",
          last_triggered_at: null,
        },
        201,
      );
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      apiKey: "pwk_live_test",
      fetch: fetchMock,
    });
    const alert = await client.createAlert({ product_id: "prod_x", notify_on_drop: true });
    assert.equal(alert.alert_id, 76);
    assert.equal(alert.notify_on_drop, true);
    assert.equal(alert.min_threshold_price, null);
  });

  it("listAlerts() filters by productId", async () => {
    const fetchMock: typeof fetch = async (input) => {
      assert.match(String(input), /\/alerts\?product_id=prod_x$/);
      return jsonResponse([]);
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      apiKey: "pwk_live_test",
      fetch: fetchMock,
    });
    const alerts = await client.listAlerts({ productId: "prod_x" });
    assert.deepEqual(alerts, []);
  });

  it("deleteAlert() accepts 204", async () => {
    const fetchMock: typeof fetch = async (input, init) => {
      assert.equal(init?.method, "DELETE");
      assert.match(String(input), /\/alerts\/76$/);
      return new Response(null, { status: 204 });
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      apiKey: "pwk_live_test",
      fetch: fetchMock,
    });
    await client.deleteAlert(76);
  });

  it("search() passes limit as query param", async () => {
    const fetchMock: typeof fetch = async (input) => {
      assert.match(String(input), /[?&]limit=10/);
      return jsonResponse([{ product_id: "prod_x", name: "Phone", shop: "Back Market" }]);
    };

    const client = new PricewatchaClient({
      baseUrl: "https://example.com/api/v1",
      fetch: fetchMock,
    });
    const results = await client.search("phone", { limit: 10 });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.product_id, "prod_x");
  });
});
