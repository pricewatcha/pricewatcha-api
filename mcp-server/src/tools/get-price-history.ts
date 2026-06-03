import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  getPriceHistoryOutputSchema,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerGetPriceHistory(server: McpServer): void {
  server.registerTool(
    "get_price_history",
    {
      description: `Get historical prices, aggregates (low/high/average), trend, and data points for a product. ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        product_id: z.string().min(1).describe("Public product ID"),
      },
      outputSchema: getPriceHistoryOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ product_id }) => {
      try {
        const history = await getClient().getPriceHistory(product_id);
        return toolSuccessResult(history);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
