export { PricewatchaClient, DEFAULT_BASE_URL } from "./client.js";
export {
  PricewatchaError,
  PricewatchaAPIError,
  PricewatchaTimeoutError,
} from "./errors.js";
export type { ApiErrorBody } from "./api-error.js";
export { isApiErrorBody, parseApiErrorPayload } from "./api-error.js";
export type {
  ApiEndpoint,
  ApiInfoResponse,
  HealthResponse,
  JobProduct,
  JobResponse,
  JobStatus,
  PriceHistoryPoint,
  PriceHistoryResponse,
  PriceTrend,
  PricewatchaClientOptions,
  Product,
  SearchResult,
  WaitForJobOptions,
} from "./types.js";
export { isActiveJobStatus, isTerminalJobStatus } from "./job-status.js";
