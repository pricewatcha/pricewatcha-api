import {
  PricewatchaAPIError,
  PricewatchaError,
  PricewatchaTimeoutError,
  parseApiErrorPayload,
  type ApiErrorBody,
} from "@pricewatcha/sdk";

import { isMcpDebugEnabled } from "../config.js";
import { getApiBaseUrl } from "./client.js";

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

/** Recover structured errors from legacy stringified JSON in error.message. */
function parseEmbeddedStructuredError(raw: string): ApiErrorBody | undefined {
  const candidates = [raw.trim()];
  const legacyPrefix = raw.split(" — HTTP ")[0]?.trim();
  if (legacyPrefix && legacyPrefix !== raw.trim()) {
    candidates.push(legacyPrefix);
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith("{")) {
      continue;
    }
    try {
      const parsed = parseApiErrorPayload(JSON.parse(candidate));
      if (parsed.errorBody) {
        return parsed.errorBody;
      }
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

function upstreamFallbackError(httpStatus: number, detail?: string): ApiErrorBody {
  const message =
    detail && !looksLikeHtml(detail)
      ? detail
      : `Unexpected upstream response (status ${httpStatus})`;
  return {
    code: "internal_error",
    message,
    http_status: httpStatus,
    retry_recommended: httpStatus === 502 || httpStatus === 503 || httpStatus === 504,
    retry_after_seconds: null,
  };
}

/** Map SDK/upstream errors to the API v1 structured error contract for MCP tool responses. */
export function buildStructuredToolError(error: unknown): ApiErrorBody {
  if (error instanceof PricewatchaAPIError) {
    if (error.errorBody) {
      return error.errorBody;
    }
    const embedded = parseEmbeddedStructuredError(error.message);
    if (embedded) {
      return embedded;
    }
    if (error.statusCode && error.statusCode >= 400) {
      return upstreamFallbackError(error.statusCode, error.message);
    }
    return upstreamFallbackError(error.statusCode ?? 500, error.message);
  }
  if (error instanceof PricewatchaTimeoutError) {
    return {
      code: "internal_error",
      message: error.message,
      http_status: 504,
      retry_recommended: true,
      retry_after_seconds: null,
    };
  }
  if (error instanceof PricewatchaError) {
    return upstreamFallbackError(500, error.message);
  }
  if (error instanceof Error) {
    return upstreamFallbackError(500, error.message);
  }
  return upstreamFallbackError(500, String(error));
}

export function toolErrorResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    isError: true,
  };
}

/** Standard MCP tool error payload — structured error.code, no debug fields by default. */
export function handleToolError(error: unknown) {
  const body: Record<string, unknown> = { error: buildStructuredToolError(error) };
  if (isMcpDebugEnabled()) {
    body.api_base_url = getApiBaseUrl();
  }
  return toolErrorResult(body);
}

export function toolSuccessResult(data: unknown) {
  const structuredContent =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { data };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent,
  };
}
