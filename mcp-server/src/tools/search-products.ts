import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  READ_ONLY_TOOL_ANNOTATIONS,
  searchProductsOutputSchema,
  TOOL_TITLES,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerSearchProducts(server: McpServer): void {
  server.registerTool(
    "search_products",
    {
      title: TOOL_TITLES.search_products,
      description: `Searches the Pricewatcha product catalog by keyword. Supports minus-prefixed exclude terms: e.g. "iPhone 15 -cover -hülle -case" returns devices only. Returns product-level data only — not user accounts or alert settings. ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(200)
          .describe(
            'Search keywords. Supports minus-prefixed exclude terms: e.g. "iPhone 15 -cover -hülle"',
          ),
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
