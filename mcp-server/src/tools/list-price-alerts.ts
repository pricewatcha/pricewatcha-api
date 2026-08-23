import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  listPriceAlertsOutputSchema,
  READ_ONLY_TOOL_ANNOTATIONS,
  TOOL_TITLES,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerListPriceAlerts(server: McpServer): void {
  server.registerTool(
    "list_price_alerts",
    {
      title: TOOL_TITLES.list_price_alerts,
      description: `List your price alerts. Optionally filter by product_id. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        product_id: z.string().min(1).optional().describe("Optional public product ID filter"),
      },
      outputSchema: listPriceAlertsOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ api_key, product_id }) => {
      try {
        const alerts = await getClient({ apiKey: api_key }).listAlerts({
          productId: product_id,
        });
        return toolSuccessResult({ count: alerts.length, alerts });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
