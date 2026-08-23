import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  priceAlertOutputSchema,
  TOOL_TITLES,
  UPDATE_ALERT_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerUpdatePriceAlert(server: McpServer): void {
  server.registerTool(
    "update_price_alert",
    {
      title: TOOL_TITLES.update_price_alert,
      description: `Update a price alert. You can switch to threshold-free notify_on_drop / notify_on_rise, change thresholds, or toggle is_active. At least one setting must remain. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        alert_id: z.number().int().positive().describe("Alert ID to update"),
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
          .nullable()
          .optional()
          .describe("Min threshold, or null to clear."),
        max_threshold_price: z
          .number()
          .positive()
          .nullable()
          .optional()
          .describe("Max threshold, or null to clear."),
        notify_email: z.boolean().optional(),
        webhook_url: z.string().url().nullable().optional(),
        name: z.string().max(128).optional(),
        is_active: z.boolean().optional(),
      },
      outputSchema: priceAlertOutputSchema,
      annotations: UPDATE_ALERT_ANNOTATIONS,
    },
    async ({
      api_key,
      alert_id,
      notify_on_drop,
      notify_on_rise,
      min_threshold_price,
      max_threshold_price,
      notify_email,
      webhook_url,
      name,
      is_active,
    }) => {
      try {
        const alert = await getClient({ apiKey: api_key }).updateAlert(alert_id, {
          notify_on_drop,
          notify_on_rise,
          min_threshold_price,
          max_threshold_price,
          notify_email,
          webhook_url,
          name,
          is_active,
        });
        return toolSuccessResult(alert);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
