import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  CREATE_ALERT_ANNOTATIONS,
  priceAlertOutputSchema,
  TOOL_TITLES,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerCreatePriceAlert(server: McpServer): void {
  server.registerTool(
    "create_price_alert",
    {
      title: TOOL_TITLES.create_price_alert,
      description: `Create a price alert for a product. Use notify_on_drop / notify_on_rise for any price change without a numeric threshold, and/or min_threshold_price / max_threshold_price for target prices. At least one of those four settings is required. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        product_id: z.string().min(1).describe("Public product ID (prod_... or demo_...)"),
        notify_on_drop: z
          .boolean()
          .optional()
          .describe("Notify on any price drop. No threshold required."),
        notify_on_rise: z
          .boolean()
          .optional()
          .describe("Notify on any price increase. No threshold required."),
        min_threshold_price: z
          .number()
          .positive()
          .optional()
          .describe("Notify when the price drops to or below this value."),
        max_threshold_price: z
          .number()
          .positive()
          .optional()
          .describe("Notify when the price rises to or above this value."),
        notify_email: z.boolean().optional().describe("Send email notifications (default true)"),
        webhook_url: z.string().url().optional().describe("Optional HTTPS webhook URL"),
        name: z.string().max(128).optional().describe("Optional alert name"),
      },
      outputSchema: priceAlertOutputSchema,
      annotations: CREATE_ALERT_ANNOTATIONS,
    },
    async ({
      api_key,
      product_id,
      notify_on_drop,
      notify_on_rise,
      min_threshold_price,
      max_threshold_price,
      notify_email,
      webhook_url,
      name,
    }) => {
      try {
        const alert = await getClient({ apiKey: api_key }).createAlert({
          product_id,
          notify_on_drop,
          notify_on_rise,
          min_threshold_price,
          max_threshold_price,
          notify_email,
          webhook_url,
          name,
        });
        return toolSuccessResult(alert);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
