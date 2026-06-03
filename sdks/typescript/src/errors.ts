import type { ApiErrorBody } from "./api-error.js";

/** Base exception for all Pricewatcha SDK errors. */
export class PricewatchaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricewatchaError";
  }
}

/** Raised when the API returns an error response or a job fails. */
export class PricewatchaAPIError extends PricewatchaError {
  readonly statusCode?: number;
  readonly detail?: string;
  readonly errorCode?: string;
  readonly errorBody?: ApiErrorBody;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      detail?: string;
      errorCode?: string;
      errorBody?: ApiErrorBody;
    },
  ) {
    super(message);
    this.name = "PricewatchaAPIError";
    this.statusCode = options?.statusCode;
    this.detail = options?.detail ?? message;
    this.errorBody = options?.errorBody;
    this.errorCode = options?.errorCode ?? options?.errorBody?.code;
  }
}

/** Raised when polling a job exceeds the configured timeout. */
export class PricewatchaTimeoutError extends PricewatchaError {
  constructor(message = "Job did not complete within the timeout") {
    super(message);
    this.name = "PricewatchaTimeoutError";
  }
}
