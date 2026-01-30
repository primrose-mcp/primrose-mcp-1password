/**
 * Vault Tools
 *
 * MCP tools for 1Password vault management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OnePasswordClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all vault-related tools
 *
 * @param server - MCP server instance
 * @param client - 1Password Connect client instance
 */
export function registerVaultTools(server: McpServer, client: OnePasswordClient): void {
  // ===========================================================================
  // List Vaults
  // ===========================================================================
  server.tool(
    '1password_list_vaults',
    `List all vaults accessible to the service account.

Returns a list of vaults with their IDs, names, and descriptions.

Args:
  - filter: Optional SCIM-style filter by name (e.g., 'name eq "My Vault"')
  - format: Response format ('json' or 'markdown')

Returns:
  JSON format: Array of Vault objects with id, name, description, items count
  Markdown format: Formatted table of vaults`,
    {
      filter: z.string().optional().describe('SCIM-style filter by name'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ filter, format }) => {
      try {
        const vaults = await client.listVaults(filter);
        return formatResponse(vaults, format, 'vaults');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Vault
  // ===========================================================================
  server.tool(
    '1password_get_vault',
    `Get detailed information about a specific vault.

Args:
  - vaultId: The vault UUID
  - format: Response format ('json' or 'markdown')

Returns:
  Vault details including id, name, description, item count, type, and timestamps.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ vaultId, format }) => {
      try {
        const vault = await client.getVault(vaultId);
        return formatResponse(vault, format, 'vault');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
