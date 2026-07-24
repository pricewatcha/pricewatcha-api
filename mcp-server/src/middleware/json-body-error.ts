import type { ErrorRequestHandler } from "express";

/** body-parser / express.json() marks parse failures with this type. */
function isJsonBodyParseError(err: unknown): err is SyntaxError & {
  status?: number;
  statusCode?: number;
  type?: string;
} {
  if (!(err instanceof SyntaxError)) {
    return false;
  }
  const typed = err as SyntaxError & { status?: number; statusCode?: number; type?: string };
  return (
    typed.type === "entity.parse.failed" ||
    typed.status === 400 ||
    typed.statusCode === 400
  );
}

/**
 * Turns express.json() SyntaxErrors into a clean 400 instead of an unhandled
 * stack dump (empty body, truncated payload, or non-JSON with Content-Type: application/json).
 */
export function createJsonBodyErrorMiddleware(): ErrorRequestHandler {
  return (err, _req, res, next) => {
    if (!isJsonBodyParseError(err)) {
      next(err);
      return;
    }
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(400).json({
      error: "invalid_json",
      message: "Request body must be valid JSON",
    });
  };
}
