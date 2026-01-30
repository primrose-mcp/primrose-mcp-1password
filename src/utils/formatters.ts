/**
 * Response Formatting Utilities
 *
 * Helpers for formatting tool responses in JSON or Markdown.
 */

import type {
  APIRequest,
  Item,
  ItemFile,
  PaginatedResponse,
  ResponseFormat,
  ServerHealth,
  Vault,
} from '../types/entities.js';
import { OnePasswordApiError, formatErrorForLogging } from './errors.js';

/**
 * MCP tool response type
 * Note: Index signature required for MCP SDK 1.25+ compatibility
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format a successful response
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  entityType: string
): ToolResponse {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text', text: formatAsMarkdown(data, entityType) }],
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format an error response
 */
export function formatError(error: unknown): ToolResponse {
  const errorInfo = formatErrorForLogging(error);

  let message: string;
  if (error instanceof OnePasswordApiError) {
    message = `Error: ${error.message}`;
    if (error.retryable) {
      message += ' (retryable)';
    }
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = `Error: ${String(error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, details: errorInfo }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: unknown, entityType: string): string {
  if (isPaginatedResponse(data)) {
    return formatPaginatedAsMarkdown(data, entityType);
  }

  if (Array.isArray(data)) {
    return formatArrayAsMarkdown(data, entityType);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObjectAsMarkdown(data as Record<string, unknown>, entityType);
  }

  return String(data);
}

/**
 * Type guard for paginated response
 */
function isPaginatedResponse(data: unknown): data is PaginatedResponse<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray((data as PaginatedResponse<unknown>).items)
  );
}

/**
 * Format paginated response as Markdown
 */
function formatPaginatedAsMarkdown(data: PaginatedResponse<unknown>, entityType: string): string {
  const lines: string[] = [];

  lines.push(`## ${capitalize(entityType)}`);
  lines.push('');

  if (data.total !== undefined) {
    lines.push(`**Total:** ${data.total} | **Showing:** ${data.count}`);
  } else {
    lines.push(`**Showing:** ${data.count}`);
  }

  if (data.hasMore) {
    lines.push(`**More available:** Yes (offset: \`${data.nextOffset}\`)`);
  }
  lines.push('');

  if (data.items.length === 0) {
    lines.push('_No items found._');
    return lines.join('\n');
  }

  // Format items based on entity type
  switch (entityType) {
    case 'vaults':
      lines.push(formatVaultsTable(data.items as Vault[]));
      break;
    case 'items':
      lines.push(formatItemsTable(data.items as Item[]));
      break;
    case 'files':
      lines.push(formatFilesTable(data.items as ItemFile[]));
      break;
    case 'activity':
      lines.push(formatActivityTable(data.items as APIRequest[]));
      break;
    default:
      lines.push(formatGenericTable(data.items));
  }

  return lines.join('\n');
}

/**
 * Format vaults as Markdown table
 */
function formatVaultsTable(vaults: Vault[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Description | Items |');
  lines.push('|---|---|---|---|');

  for (const vault of vaults) {
    lines.push(
      `| ${vault.id} | ${vault.name} | ${vault.description || '-'} | ${vault.items ?? '-'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format items as Markdown table
 */
function formatItemsTable(items: Item[]): string {
  const lines: string[] = [];
  lines.push('| ID | Title | Category | Vault | Tags |');
  lines.push('|---|---|---|---|---|');

  for (const item of items) {
    const tags = item.tags?.join(', ') || '-';
    lines.push(
      `| ${item.id} | ${item.title} | ${item.category} | ${item.vault?.name || item.vault?.id || '-'} | ${tags} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format files as Markdown table
 */
function formatFilesTable(files: ItemFile[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Size | Content Type |');
  lines.push('|---|---|---|---|');

  for (const file of files) {
    const size = file.size ? formatFileSize(file.size) : '-';
    lines.push(`| ${file.id} | ${file.name} | ${size} | ${file.content_type || '-'} |`);
  }

  return lines.join('\n');
}

/**
 * Format activity as Markdown table
 */
function formatActivityTable(activity: APIRequest[]): string {
  const lines: string[] = [];
  lines.push('| Request ID | Timestamp | Action | Result | Resource |');
  lines.push('|---|---|---|---|---|');

  for (const req of activity) {
    const resource = req.resource?.item?.id || req.resource?.vault?.id || '-';
    lines.push(
      `| ${req.requestId || '-'} | ${req.timestamp || '-'} | ${req.action || '-'} | ${req.result || '-'} | ${resource} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format a generic array as Markdown table
 */
function formatGenericTable(items: unknown[]): string {
  if (items.length === 0) return '_No items_';

  const first = items[0] as Record<string, unknown>;
  const keys = Object.keys(first).slice(0, 5); // Limit columns

  const lines: string[] = [];
  lines.push(`| ${keys.join(' | ')} |`);
  lines.push(`|${keys.map(() => '---').join('|')}|`);

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const values = keys.map((k) => String(record[k] ?? '-'));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format an array as Markdown
 */
function formatArrayAsMarkdown(data: unknown[], entityType: string): string {
  if (entityType === 'vaults') {
    return formatVaultsTable(data as Vault[]);
  }
  if (entityType === 'items') {
    return formatItemsTable(data as Item[]);
  }
  if (entityType === 'files') {
    return formatFilesTable(data as ItemFile[]);
  }
  if (entityType === 'activity') {
    return formatActivityTable(data as APIRequest[]);
  }
  if (entityType === 'health') {
    return formatHealthAsMarkdown(data[0] as ServerHealth);
  }
  return formatGenericTable(data);
}

/**
 * Format server health as Markdown
 */
function formatHealthAsMarkdown(health: ServerHealth): string {
  const lines: string[] = [];
  lines.push('## Server Health');
  lines.push('');
  lines.push(`**Name:** ${health.name || '-'}`);
  lines.push(`**Version:** ${health.version || '-'}`);
  lines.push('');

  if (health.dependencies && health.dependencies.length > 0) {
    lines.push('### Dependencies');
    lines.push('| Service | Status | Message |');
    lines.push('|---|---|---|');
    for (const dep of health.dependencies) {
      lines.push(`| ${dep.service || '-'} | ${dep.status || '-'} | ${dep.message || '-'} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a single object as Markdown
 */
function formatObjectAsMarkdown(data: Record<string, unknown>, entityType: string): string {
  const lines: string[] = [];
  lines.push(`## ${capitalize(entityType.replace(/s$/, ''))}`);
  lines.push('');

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object') {
      lines.push(`**${formatKey(key)}:**`);
      lines.push('```json');
      lines.push(JSON.stringify(value, null, 2));
      lines.push('```');
    } else {
      lines.push(`**${formatKey(key)}:** ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a key for display (camelCase to Title Case)
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
