/**
 * Health & Monitoring Tools
 *
 * MCP tools for 1Password Connect server health monitoring.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OnePasswordClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all health-related tools
 *
 * @param server - MCP server instance
 * @param client - 1Password Connect client instance
 */
export function registerHealthTools(server: McpServer, client: OnePasswordClient): void {
  // ===========================================================================
  // Get Health
  // ===========================================================================
  server.tool(
    '1password_get_health',
    `Check the health status of the 1Password Connect server.

Returns server name, version, and status of dependencies.

Args:
  - format: Response format ('json' or 'markdown')

Returns:
  ServerHealth object with name, version, and dependencies array.`,
    {
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ format }) => {
      try {
        const health = await client.getHealth();
        return formatResponse(health, format, 'health');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Heartbeat
  // ===========================================================================
  server.tool(
    '1password_heartbeat',
    `Simple ping to verify the Connect server is available.

Returns:
  A simple response indicating the server is alive.`,
    {},
    async () => {
      try {
        const response = await client.heartbeat();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Server is alive', response },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
