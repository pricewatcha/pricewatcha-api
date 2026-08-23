import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  DELETE_ALERT_ANNOTATIONS,
  deletePriceAlertOutputSchema,
  TOOL_TITLES,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerDeletePriceAlert(server: McpServer): void {
  server.registerTool(
    "delete_price_alert",
    {
      title: TOOL_TITLES.delete_price_alert,
      description: `Delete a price alert. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        alert_id: z.number().int().positive().describe("Alert ID to delete"),
      },
      outputSchema: deletePriceAlertOutputSchema,
      annotations: DELETE_ALERT_ANNOTATIONS,
    },
    async ({ api_key, alert_id }) => {
      try {
        await getClient({ apiKey: api_key }).deleteAlert(alert_id);
        return toolSuccessResult({ deleted: true, alert_id });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
