import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  TOOL_TITLES,
  WATCH_ANNOTATIONS,
  watchStatusOutputSchema,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerWatchProduct(server: McpServer): void {
  server.registerTool(
    "watch_product",
    {
      title: TOOL_TITLES.watch_product,
      description: `Add a catalog product to your account watchlist so the price scheduler keeps updating it. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        product_id: z.string().min(1).describe("Public product ID (prod_... or demo_...)"),
      },
      outputSchema: watchStatusOutputSchema,
      annotations: WATCH_ANNOTATIONS,
    },
    async ({ api_key, product_id }) => {
      try {
        const status = await getClient({ apiKey: api_key }).watchProduct(product_id);
        return toolSuccessResult(status);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
