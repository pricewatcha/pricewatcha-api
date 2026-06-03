export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface ApiInfoResponse {
  name: string;
  version: string;
  status: string;
  description: string;
  documentation_url: string;
  available_endpoints: ApiEndpoint[];
  disclaimer: string;
  agent_ready?: boolean;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  http_status: number | null;
  retry_recommended: boolean;
  retry_after_seconds?: number | null;
}

export type JobStatus = "queued" | "running" | "processing" | "completed" | "failed";

/** Product payload on a completed ingestion job. */
export interface JobProduct {
  product_id: string;
  name: string;
  shop: string;
  product_url: string;
  currency: string;
  current_price: number | null;
  status: string;
  last_checked_at: string | null;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  product: JobProduct | null;
  error: ApiErrorBody | null;
  hint?: string;
}

export interface Product {
  product_id: string;
  name: string;
  shop: string;
  product_url: string;
  currency: string;
  current_price: number | null;
  last_checked_at: string | null;
  status: string;
  preview?: boolean;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export type PriceTrend = "downward" | "upward" | "stable" | "unknown";

export interface PriceHistoryResponse {
  product_id: string;
  currency: string;
  current_price: number | null;
  historical_low: number | null;
  historical_high: number | null;
  average_price: number | null;
  trend: PriceTrend;
  data_points: PriceHistoryPoint[];
  preview?: boolean;
}

export interface SearchResult {
  product_id: string;
  name: string;
  shop: string;
  product_url?: string | null;
  current_price?: number | null;
  preview?: boolean;
}

export interface WaitForJobOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export interface PricewatchaClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}
