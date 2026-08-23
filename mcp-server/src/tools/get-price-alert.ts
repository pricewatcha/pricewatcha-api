import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  priceAlertOutputSchema,
  READ_ONLY_TOOL_ANNOTATIONS,
  TOOL_TITLES,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerGetPriceAlert(server: McpServer): void {
  server.registerTool(
    "get_price_alert",
    {
      title: TOOL_TITLES.get_price_alert,
      description: `Get one price alert by alert_id. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        alert_id: z.number().int().positive().describe("Alert ID from create_price_alert or list_price_alerts"),
      },
      outputSchema: priceAlertOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ api_key, alert_id }) => {
      try {
        const alert = await getClient({ apiKey: api_key }).getAlert(alert_id);
        return toolSuccessResult(alert);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
