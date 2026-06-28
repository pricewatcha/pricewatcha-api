import { apiErrorFromJobFailure, parseApiErrorPayload } from "./api-error.js";
import { PricewatchaAPIError, PricewatchaTimeoutError } from "./errors.js";
import { isActiveJobStatus, isTerminalJobStatus } from "./job-status.js";
import type {
  ApiErrorBody,
  ApiInfoResponse,
  HealthResponse,
  JobResponse,
  PriceHistoryResponse,
  PricewatchaClientOptions,
  Product,
  SearchResult,
  WaitForJobOptions,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://pricewatcha.com/api/v1";

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_INTERVAL_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lightweight client for the Pricewatcha API v1.
 *
 * No API key required for public read endpoints. Pass apiKey for alerts and webhooks.
 * POST /track long-polls briefly; use getJob or trackAndWait for slow jobs.
 */
export class PricewatchaClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly headers: Record<string, string>;

  constructor(options: PricewatchaClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.headers = {
      "User-Agent": "@pricewatcha/sdk/0.1.0",
      Accept: "application/json",
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      ...options.headers,
    };
  }

  private url(path: string): string {
    if (!path) return this.baseUrl;
    return `${this.baseUrl}/${path.replace(/^\//, "")}`;
  }

  private async parseErrorResponse(response: Response): Promise<{
    message: string;
    errorBody?: ApiErrorBody;
  }> {
    const text = await response.text();
    try {
      return parseApiErrorPayload(JSON.parse(text));
    } catch {
      return { message: text || `HTTP ${response.status}` };
    }
  }

  private async request<T>(
    method: string,
    path: string,
    init?: RequestInit & { expectedStatus?: number | number[] },
  ): Promise<T> {
    const expected = init?.expectedStatus ?? 200;
    const expectedList = Array.isArray(expected) ? expected : [expected];
    const { expectedStatus: _, ...rest } = init ?? {};

    const response = await this.fetchFn(this.url(path), {
      method,
      headers: {
        ...this.headers,
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
      ...rest,
    });

    if (!expectedList.includes(response.status)) {
      const parsed = await this.parseErrorResponse(response);
      throw new PricewatchaAPIError(parsed.message, {
        statusCode: response.status,
        detail: parsed.message,
        errorBody: parsed.errorBody,
      });
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  /** GET /health */
  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/health");
  }

  /** GET /api/v1 — discovery */
  info(): Promise<ApiInfoResponse> {
    return this.request<ApiInfoResponse>("GET", "");
  }

  /** POST /track — bounded server-side long-poll (default ~25s) */
  track(url: string): Promise<JobResponse> {
    return this.request<JobResponse>("POST", "/track", {
      expectedStatus: 200,
      body: JSON.stringify({ url }),
    });
  }

  /** GET /jobs/:jobId — poll job status */
  getJob(jobId: string): Promise<JobResponse> {
    return this.request<JobResponse>("GET", `/jobs/${encodeURIComponent(jobId)}`);
  }

  /** Poll getJob until completed or failed, or raise on timeout. */
  async waitForJob(jobId: string, options: WaitForJobOptions = {}): Promise<JobResponse> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const job = await this.getJob(jobId);
      if (job.status === "completed") return job;
      if (job.status === "failed") {
        const errorBody = apiErrorFromJobFailure(job.error);
        throw new PricewatchaAPIError(errorBody?.message ?? "Tracking job failed", {
          statusCode: errorBody?.http_status ?? undefined,
          detail: errorBody?.message,
          errorBody,
        });
      }
      if (!isActiveJobStatus(job.status) || Date.now() >= deadline) break;
      await sleep(Math.min(intervalMs, deadline - Date.now()));
    }

    throw new PricewatchaTimeoutError(
      `Job "${jobId}" did not complete within ${timeoutMs}ms`,
    );
  }

  /**
   * Track a URL, then poll getJob until terminal state or timeout.
   * Client-side loop over track + getJob — no special server endpoint.
   */
  async trackAndWait(url: string, options: WaitForJobOptions = {}): Promise<JobResponse> {
    const job = await this.track(url);
    if (isTerminalJobStatus(job.status)) {
      return job;
    }
    return this.waitForJob(job.job_id, options);
  }

  /** GET /products/:productId */
  getProduct(productId: string): Promise<Product> {
    return this.request<Product>("GET", `/products/${encodeURIComponent(productId)}`);
  }

  /** GET /products/:productId/price-history */
  getPriceHistory(productId: string): Promise<PriceHistoryResponse> {
    return this.request<PriceHistoryResponse>(
      "GET",
      `/products/${encodeURIComponent(productId)}/price-history`,
    );
  }

  /** GET /search?q=... */
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    return this.request<SearchResult[]>("GET", `/search?${params.toString()}`);
  }
}
