/** Structured error body returned by Pricewatcha API v1. */

export interface ApiErrorBody {
  code: string;
  message: string;
  http_status: number | null;
  retry_recommended: boolean;
  retry_after_seconds?: number | null;
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.code === "string" &&
    typeof obj.message === "string" &&
    (typeof obj.http_status === "number" || obj.http_status === null) &&
    typeof obj.retry_recommended === "boolean"
  );
}

/** Parse API JSON error payloads (structured `error` or legacy FastAPI `detail`). */
export function parseApiErrorPayload(payload: unknown): {
  message: string;
  errorBody?: ApiErrorBody;
} {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (isApiErrorBody(record.error)) {
      return { message: record.error.message, errorBody: record.error };
    }
    if (typeof record.detail === "string") {
      return { message: record.detail };
    }
    if (record.detail != null) {
      return { message: String(record.detail) };
    }
  }
  return { message: "Request failed" };
}

export function apiErrorFromJobFailure(jobError: unknown): ApiErrorBody | undefined {
  if (isApiErrorBody(jobError)) {
    return jobError;
  }
  if (typeof jobError === "string" && jobError.trim()) {
    return {
      code: "internal_error",
      message: jobError,
      http_status: 422,
      retry_recommended: false,
      retry_after_seconds: null,
    };
  }
  return undefined;
}
