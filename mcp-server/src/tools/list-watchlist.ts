import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  TOOL_TITLES,
  READ_ONLY_TOOL_ANNOTATIONS,
  watchListOutputSchema,
} from "../utils/tool-metadata.js";
import { API_KEY_HINT, STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerListWatchlist(server: McpServer): void {
  server.registerTool(
    "list_watchlist",
    {
      title: TOOL_TITLES.list_watchlist,
      description: `List products your account watches for continuous price updates. ${API_KEY_HINT} ${STRUCTURED_ERROR_HINT}`,
      inputSchema: {
        api_key: z.string().min(1).describe("Pricewatcha API key (pwk_live_...)"),
        limit: z.number().int().min(1).max(200).optional().describe("Max items (default 50)"),
        offset: z.number().int().min(0).optional().describe("Items to skip (default 0)"),
      },
      outputSchema: watchListOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ api_key, limit, offset }) => {
      try {
        const list = await getClient({ apiKey: api_key }).listWatchlist({ limit, offset });
        return toolSuccessResult(list);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
