import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  READ_ONLY_TOOL_ANNOTATIONS,
  searchProductsOutputSchema,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerSearchProducts(server: McpServer): void {
  server.registerTool(
    "search_products",
    {
      description: `Search the full Pricewatcha product catalog by keyword (name, URL, shop/platform). Returns product-level data only — not user accounts or alert settings. ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        query: z.string().min(1).max(200).describe("Search keywords, e.g. iphone 15 pro"),
      },
      outputSchema: searchProductsOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ query }) => {
      try {
        const results = await getClient().search(query);
        return toolSuccessResult({
          query,
          count: results.length,
          results,
        });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
