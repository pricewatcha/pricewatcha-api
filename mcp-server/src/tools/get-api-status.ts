import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getApiBaseUrl, getClient } from "../utils/client.js";
import { handleToolError, toolSuccessResult } from "../utils/errors.js";
import {
  getApiStatusOutputSchema,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../utils/tool-metadata.js";
import { STRUCTURED_ERROR_HINT } from "../utils/tool-descriptions.js";

export function registerGetApiStatus(server: McpServer): void {
  server.registerTool(
    "get_api_status",
    {
      description: `Check whether the Pricewatcha public API is available. Returns health and discovery metadata. ${STRUCTURED_ERROR_HINT}`,
      outputSchema: getApiStatusOutputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () => {
      try {
        const client = getClient();
        const [health, info] = await Promise.all([client.health(), client.info()]);
        return toolSuccessResult({
          base_url: getApiBaseUrl(),
          health,
          api: {
            name: info.name,
            version: info.version,
            status: info.status,
            description: info.description,
            agent_ready: info.agent_ready,
          },
        });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
