import type { JobResponse } from "@pricewatcha/sdk";

/** MCP-oriented hint when track_product long-poll times out while the job is still running. */
export const MCP_TRACK_RUNNING_HINT =
  "Job still running. Call the get_job_status tool with this job_id to poll for the result.";

/** Uniform MCP payload for get_job_status (API hint passed through unchanged). */
export function formatJobStatusResult(job: JobResponse): Record<string, unknown> {
  return {
    job_id: job.job_id,
    status: job.status,
    product: job.product ?? null,
    error: job.error ?? null,
    ...(job.hint !== undefined ? { hint: job.hint } : {}),
  };
}

/** MCP payload for track_product; rewrites running-job hints for tool callers. */
export function formatTrackProductResult(job: JobResponse): Record<string, unknown> {
  const formatted = formatJobStatusResult(job);
  if (job.status === "running" && job.hint !== undefined) {
    formatted.hint = MCP_TRACK_RUNNING_HINT;
  }
  return formatted;
}
