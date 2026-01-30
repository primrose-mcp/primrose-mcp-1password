/**
 * File Tools
 *
 * MCP tools for 1Password file management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OnePasswordClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all file-related tools
 *
 * @param server - MCP server instance
 * @param client - 1Password Connect client instance
 */
export function registerFileTools(server: McpServer, client: OnePasswordClient): void {
  // ===========================================================================
  // List Files
  // ===========================================================================
  server.tool(
    '1password_list_files',
    `List all files attached to an item.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID
  - inlineContent: If true, include Base64-encoded file content in response
  - format: Response format ('json' or 'markdown')

Returns:
  Array of File objects with id, name, size, content_type.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID'),
      inlineContent: z.boolean().optional().describe('Include Base64-encoded content'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ vaultId, itemId, inlineContent, format }) => {
      try {
        const files = await client.listFiles(vaultId, itemId, inlineContent);
        return formatResponse(files, format, 'files');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get File Details
  // ===========================================================================
  server.tool(
    '1password_get_file',
    `Get details for a specific file attached to an item.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID
  - fileId: The file UUID
  - inlineContent: If true, include Base64-encoded file content in response
  - format: Response format ('json' or 'markdown')

Returns:
  File object with id, name, size, content_type, and optionally content.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID'),
      fileId: z.string().describe('File UUID'),
      inlineContent: z.boolean().optional().describe('Include Base64-encoded content'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ vaultId, itemId, fileId, inlineContent, format }) => {
      try {
        const file = await client.getFile(vaultId, itemId, fileId, inlineContent);
        return formatResponse(file, format, 'file');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get File Content
  // ===========================================================================
  server.tool(
    '1password_get_file_content',
    `Download the raw content of a file.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID
  - fileId: The file UUID

Returns:
  Base64-encoded file content.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID'),
      fileId: z.string().describe('File UUID'),
    },
    async ({ vaultId, itemId, fileId }) => {
      try {
        const content = await client.getFileContent(vaultId, itemId, fileId);
        // Convert ArrayBuffer to Base64
        const bytes = new Uint8Array(content);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  encoding: 'base64',
                  content: base64,
                },
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
