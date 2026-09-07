import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import { formatTrackProductResult } from "../utils/job-result.js";
import {
  jobStatusOutputSchema,
  TOOL_TITLES,
  TRACK_PRODUCT_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerTrackProduct(server: McpServer): void {
  server.registerTool(
    "track_product",
    {
      title: TOOL_TITLES.track_product,
      description: `Submit a public product URL for price tracking. Waits up to ~25s server-side; fast shops return status "completed" with product in one call. Slow jobs return status "running" with job_id — poll get_job_status. ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        url: z.string().url().describe("Public product page URL from a supported shop"),
        api_key: z
          .string()
          .min(1)
          .optional()
          .describe("Optional API key (pwk_live_...). Required for watch/refresh."),
        watch: z
          .boolean()
          .optional()
          .describe("If true (API key required), enroll the product for continuous scheduler updates."),
        refresh: z
          .boolean()
          .optional()
          .describe("If true (API key required), force a re-scrape even if the URL is already in the catalog."),
      },
      outputSchema: jobStatusOutputSchema,
      annotations: TRACK_PRODUCT_ANNOTATIONS,
    },
    async ({ url, api_key, watch, refresh }) => {
      try {
        const job = await getClient(api_key ? { apiKey: api_key } : undefined).track(url, {
          watch: Boolean(watch),
          refresh: Boolean(refresh),
        });
        return toolSuccessResult(formatTrackProductResult(job));
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
