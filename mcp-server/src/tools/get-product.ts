import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  getProductOutputSchema,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerGetProduct(server: McpServer): void {
  server.registerTool(
    "get_product",
    {
      description: `Get structured product price intelligence by product_id (e.g. demo_iphone_15_pro or prod_xxx from a completed job). ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        product_id: z.string().min(1).describe("Public product ID"),
      },
      outputSchema: getProductOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ product_id }) => {
      try {
        const product = await getClient().getProduct(product_id);
        return toolSuccessResult(product);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
