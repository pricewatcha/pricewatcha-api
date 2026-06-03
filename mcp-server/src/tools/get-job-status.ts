import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import { formatJobStatusResult } from "../utils/job-result.js";
import {
  jobStatusOutputSchema,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerGetJobStatus(server: McpServer): void {
  server.registerTool(
    "get_job_status",
    {
      description: `Poll an async tracking job by job_id. Returns status (queued, running, completed, or failed). On completion, product is populated; on scrape failure, error is populated (HTTP 200 job lookup — not a transport error). ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        job_id: z.string().min(1).describe("Job ID from track_product"),
      },
      outputSchema: jobStatusOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ job_id }) => {
      try {
        const job = await getClient().getJob(job_id);
        return toolSuccessResult(formatJobStatusResult(job));
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
