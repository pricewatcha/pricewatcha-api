import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  TOOL_TITLES,
  READ_ONLY_TOOL_ANNOTATIONS,
  watchStatusOutputSchema,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerGetWatchStatus(server: McpServer): void {
  server.registerTool(
    "get_watch_status",
    {
      title: TOOL_TITLES.get_watch_status,
      description: `Check whether your account watches a product for continuous updates. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        product_id: z.string().min(1).describe("Public product ID (prod_... or demo_...)"),
      },
      outputSchema: watchStatusOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ api_key, product_id }) => {
      try {
        const status = await getClient({ apiKey: api_key }).getWatchStatus(product_id);
        return toolSuccessResult(status);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
