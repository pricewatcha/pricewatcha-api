import type { JobStatus } from "./types.js";

/** Job reached a terminal scrape outcome. */
export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === "completed" || status === "failed";
}

/** Job is still in the ingestion pipeline (includes status `processing`). */
export function isActiveJobStatus(status: JobStatus): boolean {
  return status === "queued" || status === "running" || status === "processing";
}
