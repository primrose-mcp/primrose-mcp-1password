/**
 * Activity Tools
 *
 * MCP tools for 1Password Connect activity monitoring.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OnePasswordClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all activity-related tools
 *
 * @param server - MCP server instance
 * @param client - 1Password Connect client instance
 */
export function registerActivityTools(server: McpServer, client: OnePasswordClient): void {
  // ===========================================================================
  // List Activity
  // ===========================================================================
  server.tool(
    '1password_list_activity',
    `Retrieve the API activity log from the Connect server.

Shows audit trail of API requests made to the server.

Args:
  - limit: Maximum number of activity entries to return
  - offset: Offset for pagination
  - format: Response format ('json' or 'markdown')

Returns:
  Array of APIRequest objects with requestId, timestamp, action, result, actor, and resource details.`,
    {
      limit: z.number().int().min(1).max(100).optional().describe('Maximum entries to return'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ limit, offset, format }) => {
      try {
        const activity = await client.listActivity({ limit, offset });
        return formatResponse(activity, format, 'activity');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
