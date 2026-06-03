import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import { formatTrackProductResult } from "../utils/job-result.js";
import {
  jobStatusOutputSchema,
  TRACK_PRODUCT_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerTrackProduct(server: McpServer): void {
  server.registerTool(
    "track_product",
    {
      description: `Submit a public product URL for price tracking. Waits up to ~25s server-side; fast shops return status "completed" with product in one call. Slow jobs return status "running" with job_id — poll get_job_status. ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        url: z.string().url().describe("Public product page URL from a supported shop"),
      },
      outputSchema: jobStatusOutputSchema,
      annotations: TRACK_PRODUCT_ANNOTATIONS,
    },
    async ({ url }) => {
      try {
        const job = await getClient().track(url);
        return toolSuccessResult(formatTrackProductResult(job));
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
