/**
 * Item Tools
 *
 * MCP tools for 1Password item management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OnePasswordClient } from '../client.js';
import type { ItemCategory, ItemField, ItemSection, ItemUrl, JsonPatchOperation } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

// Schema for item fields
const itemFieldSchema = z.object({
  id: z.string().describe('Unique identifier for the field'),
  type: z
    .enum([
      'STRING',
      'CONCEALED',
      'EMAIL',
      'URL',
      'OTP',
      'DATE',
      'MONTH_YEAR',
      'PHONE',
      'MENU',
      'FILE',
      'ADDRESS',
      'CREDIT_CARD_TYPE',
      'CREDIT_CARD_NUMBER',
      'REFERENCE',
      'SSHKEY',
    ])
    .optional()
    .describe('Type of the field'),
  purpose: z.enum(['USERNAME', 'PASSWORD', 'NOTES']).optional().describe('Purpose of the field'),
  label: z.string().optional().describe('Label displayed for the field'),
  value: z.string().optional().describe('Value of the field'),
  section: z
    .object({ id: z.string() })
    .optional()
    .describe('Section this field belongs to'),
});

// Schema for item sections
const itemSectionSchema = z.object({
  id: z.string().describe('Unique identifier for the section'),
  label: z.string().optional().describe('Label for the section'),
});

// Schema for item URLs
const itemUrlSchema = z.object({
  label: z.string().optional().describe('Label for the URL'),
  primary: z.boolean().optional().describe('Whether this is the primary URL'),
  href: z.string().describe('The URL'),
});

// Schema for JSON Patch operations
const jsonPatchOpSchema = z.object({
  op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']).describe('Operation type'),
  path: z.string().describe('JSON Pointer path'),
  value: z.unknown().optional().describe('Value for add/replace/test operations'),
  from: z.string().optional().describe('From path for move/copy operations'),
});

const itemCategorySchema = z.enum([
  'LOGIN',
  'SECURE_NOTE',
  'CREDIT_CARD',
  'IDENTITY',
  'PASSWORD',
  'DOCUMENT',
  'API_CREDENTIAL',
  'DATABASE',
  'BANK_ACCOUNT',
  'CUSTOM',
  'DRIVER_LICENSE',
  'EMAIL_ACCOUNT',
  'MEMBERSHIP',
  'OUTDOOR_LICENSE',
  'PASSPORT',
  'REWARD_PROGRAM',
  'SERVER',
  'SOCIAL_SECURITY_NUMBER',
  'SOFTWARE_LICENSE',
  'SSH_KEY',
  'WIRELESS_ROUTER',
]);

/**
 * Register all item-related tools
 *
 * @param server - MCP server instance
 * @param client - 1Password Connect client instance
 */
export function registerItemTools(server: McpServer, client: OnePasswordClient): void {
  // ===========================================================================
  // List Items
  // ===========================================================================
  server.tool(
    '1password_list_items',
    `List items in a vault.

Returns items without full field/section details. Use get_item to fetch complete details.

Args:
  - vaultId: The vault UUID
  - filter: Optional filter by title or tag (e.g., 'title eq "My Login"' or 'tag eq "work"')
  - format: Response format ('json' or 'markdown')

Returns:
  Array of Item objects with id, title, category, vault, tags.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      filter: z.string().optional().describe('Filter by title or tag'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ vaultId, filter, format }) => {
      try {
        const items = await client.listItems(vaultId, filter);
        return formatResponse(items, format, 'items');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Item
  // ===========================================================================
  server.tool(
    '1password_get_item',
    `Get complete details for a specific item including all fields and sections.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID
  - format: Response format ('json' or 'markdown')

Returns:
  Full Item object with all fields, sections, URLs, and metadata.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ vaultId, itemId, format }) => {
      try {
        const item = await client.getItem(vaultId, itemId);
        return formatResponse(item, format, 'item');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Item
  // ===========================================================================
  server.tool(
    '1password_create_item',
    `Create a new item in a vault.

Args:
  - vaultId: The vault UUID to create the item in
  - title: Title of the item
  - category: Item category (LOGIN, SECURE_NOTE, PASSWORD, API_CREDENTIAL, etc.)
  - fields: Array of field objects with id, type, label, value, purpose, section
  - sections: Optional array of section objects with id and label
  - urls: Optional array of URL objects with href, label, primary
  - tags: Optional array of tags
  - favorite: Whether to mark as favorite

Returns:
  The created Item object with assigned UUID.

Example fields:
  [
    { "id": "username", "type": "STRING", "purpose": "USERNAME", "label": "Username", "value": "user@example.com" },
    { "id": "password", "type": "CONCEALED", "purpose": "PASSWORD", "label": "Password", "value": "secret123" }
  ]`,
    {
      vaultId: z.string().describe('Vault UUID'),
      title: z.string().describe('Title of the item'),
      category: itemCategorySchema.describe('Item category'),
      fields: z.array(itemFieldSchema).optional().describe('Item fields'),
      sections: z.array(itemSectionSchema).optional().describe('Item sections'),
      urls: z.array(itemUrlSchema).optional().describe('Item URLs'),
      tags: z.array(z.string()).optional().describe('Item tags'),
      favorite: z.boolean().optional().describe('Whether to mark as favorite'),
    },
    async ({ vaultId, title, category, fields, sections, urls, tags, favorite }) => {
      try {
        const item = await client.createItem(vaultId, {
          title,
          category: category as ItemCategory,
          vault: { id: vaultId },
          fields: fields as ItemField[] | undefined,
          sections: sections as ItemSection[] | undefined,
          urls: urls as ItemUrl[] | undefined,
          tags,
          favorite,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Item created', item }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update Item (Full Replace)
  // ===========================================================================
  server.tool(
    '1password_update_item',
    `Update an item by replacing it entirely.

This is a full replacement - all fields must be provided.
Use patch_item for partial updates.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID
  - title: New title for the item
  - category: Item category
  - fields: Complete array of field objects
  - sections: Complete array of section objects
  - urls: Complete array of URL objects
  - tags: Complete array of tags
  - favorite: Whether to mark as favorite

Returns:
  The updated Item object.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID'),
      title: z.string().describe('Title of the item'),
      category: itemCategorySchema.describe('Item category'),
      fields: z.array(itemFieldSchema).optional().describe('Item fields'),
      sections: z.array(itemSectionSchema).optional().describe('Item sections'),
      urls: z.array(itemUrlSchema).optional().describe('Item URLs'),
      tags: z.array(z.string()).optional().describe('Item tags'),
      favorite: z.boolean().optional().describe('Whether to mark as favorite'),
    },
    async ({ vaultId, itemId, title, category, fields, sections, urls, tags, favorite }) => {
      try {
        const item = await client.updateItem(vaultId, itemId, {
          id: itemId,
          title,
          category: category as ItemCategory,
          vault: { id: vaultId },
          fields: fields as ItemField[] | undefined,
          sections: sections as ItemSection[] | undefined,
          urls: urls as ItemUrl[] | undefined,
          tags,
          favorite,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Item updated', item }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Patch Item (Partial Update)
  // ===========================================================================
  server.tool(
    '1password_patch_item',
    `Apply partial updates to an item using JSON Patch (RFC 6902).

This allows updating specific fields without providing the entire item.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID
  - operations: Array of JSON Patch operations

Operation format:
  { "op": "replace", "path": "/title", "value": "New Title" }
  { "op": "add", "path": "/fields/-", "value": { "id": "new", "type": "STRING", "label": "New Field", "value": "value" } }
  { "op": "remove", "path": "/fields/0" }

Returns:
  The updated Item object.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID'),
      operations: z.array(jsonPatchOpSchema).describe('JSON Patch operations'),
    },
    async ({ vaultId, itemId, operations }) => {
      try {
        const item = await client.patchItem(vaultId, itemId, operations as JsonPatchOperation[]);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Item patched', item }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Delete Item
  // ===========================================================================
  server.tool(
    '1password_delete_item',
    `Permanently delete an item from a vault.

WARNING: This action cannot be undone.

Args:
  - vaultId: The vault UUID
  - itemId: The item UUID to delete

Returns:
  Confirmation of deletion.`,
    {
      vaultId: z.string().describe('Vault UUID'),
      itemId: z.string().describe('Item UUID to delete'),
    },
    async ({ vaultId, itemId }) => {
      try {
        await client.deleteItem(vaultId, itemId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Item ${itemId} deleted from vault ${vaultId}` },
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
