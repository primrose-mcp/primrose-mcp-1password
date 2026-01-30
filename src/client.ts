/**
 * 1Password Connect API Client
 *
 * This file handles all HTTP communication with the 1Password Connect server.
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different Connect tokens.
 */

import type {
  APIRequest,
  Item,
  ItemCreateInput,
  ItemFile,
  ItemUpdateInput,
  JsonPatchOperation,
  PaginatedResponse,
  PaginationParams,
  ServerHealth,
  Vault,
} from './types/entities.js';
import type { TenantCredentials } from './types/env.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  OnePasswordApiError,
  RateLimitError,
} from './utils/errors.js';

// =============================================================================
// 1Password Connect Client Interface
// =============================================================================

export interface OnePasswordClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;

  // Health & Monitoring
  getHealth(): Promise<ServerHealth>;
  heartbeat(): Promise<string>;

  // Vaults
  listVaults(filter?: string): Promise<Vault[]>;
  getVault(vaultId: string): Promise<Vault>;

  // Items
  listItems(vaultId: string, filter?: string): Promise<Item[]>;
  getItem(vaultId: string, itemId: string): Promise<Item>;
  createItem(vaultId: string, item: ItemCreateInput): Promise<Item>;
  updateItem(vaultId: string, itemId: string, item: ItemUpdateInput): Promise<Item>;
  patchItem(vaultId: string, itemId: string, operations: JsonPatchOperation[]): Promise<Item>;
  deleteItem(vaultId: string, itemId: string): Promise<void>;

  // Files
  listFiles(vaultId: string, itemId: string, inlineContent?: boolean): Promise<ItemFile[]>;
  getFile(vaultId: string, itemId: string, fileId: string, inlineContent?: boolean): Promise<ItemFile>;
  getFileContent(vaultId: string, itemId: string, fileId: string): Promise<ArrayBuffer>;

  // Activity
  listActivity(params?: PaginationParams): Promise<PaginatedResponse<APIRequest>>;
}

// =============================================================================
// 1Password Connect Client Implementation
// =============================================================================

class OnePasswordClientImpl implements OnePasswordClient {
  private credentials: TenantCredentials;
  private baseUrl: string;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
    // Connect server URL with /v1 prefix
    const host = credentials.connectHost?.replace(/\/$/, '') || 'http://localhost:8080';
    this.baseUrl = `${host}/v1`;
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials.connectToken) {
      throw new AuthenticationError(
        'No Connect token provided. Include X-1Password-Connect-Token header.'
      );
    }

    return {
      Authorization: `Bearer ${this.credentials.connectToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : 60);
    }

    // Handle authentication errors
    if (response.status === 401) {
      throw new AuthenticationError('Authentication failed. Check your Connect token.');
    }

    // Handle authorization errors
    if (response.status === 403) {
      throw new AuthorizationError(
        'Authorization failed. Check your service account permissions.'
      );
    }

    // Handle not found
    if (response.status === 404) {
      throw new NotFoundError('Resource', endpoint);
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new OnePasswordApiError(message, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private async requestRaw(endpoint: string, options: RequestInit = {}): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError('Authentication failed. Check your Connect token.');
      }
      if (response.status === 403) {
        throw new AuthorizationError('Authorization failed. Check your service account permissions.');
      }
      if (response.status === 404) {
        throw new NotFoundError('File', endpoint);
      }
      throw new OnePasswordApiError(`API error: ${response.status}`, response.status);
    }

    return response.arrayBuffer();
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const health = await this.getHealth();
      return {
        connected: true,
        message: `Successfully connected to 1Password Connect server (${health.name} v${health.version})`,
      };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ===========================================================================
  // Health & Monitoring
  // ===========================================================================

  async getHealth(): Promise<ServerHealth> {
    return this.request<ServerHealth>('/health');
  }

  async heartbeat(): Promise<string> {
    const url = `${this.baseUrl}/heartbeat`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new OnePasswordApiError(`Heartbeat failed: ${response.status}`, response.status);
    }

    return response.text();
  }

  // ===========================================================================
  // Vaults
  // ===========================================================================

  async listVaults(filter?: string): Promise<Vault[]> {
    const queryParams = new URLSearchParams();
    if (filter) {
      queryParams.set('filter', filter);
    }
    const query = queryParams.toString();
    const endpoint = query ? `/vaults?${query}` : '/vaults';
    return this.request<Vault[]>(endpoint);
  }

  async getVault(vaultId: string): Promise<Vault> {
    return this.request<Vault>(`/vaults/${encodeURIComponent(vaultId)}`);
  }

  // ===========================================================================
  // Items
  // ===========================================================================

  async listItems(vaultId: string, filter?: string): Promise<Item[]> {
    const queryParams = new URLSearchParams();
    if (filter) {
      queryParams.set('filter', filter);
    }
    const query = queryParams.toString();
    const endpoint = query
      ? `/vaults/${encodeURIComponent(vaultId)}/items?${query}`
      : `/vaults/${encodeURIComponent(vaultId)}/items`;
    return this.request<Item[]>(endpoint);
  }

  async getItem(vaultId: string, itemId: string): Promise<Item> {
    return this.request<Item>(
      `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`
    );
  }

  async createItem(vaultId: string, item: ItemCreateInput): Promise<Item> {
    // Ensure vault ID is set
    const itemWithVault = {
      ...item,
      vault: { id: vaultId },
    };
    return this.request<Item>(`/vaults/${encodeURIComponent(vaultId)}/items`, {
      method: 'POST',
      body: JSON.stringify(itemWithVault),
    });
  }

  async updateItem(vaultId: string, itemId: string, item: ItemUpdateInput): Promise<Item> {
    // PUT replaces the entire item
    const itemWithIds = {
      ...item,
      id: itemId,
      vault: { id: vaultId },
    };
    return this.request<Item>(
      `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(itemWithIds),
      }
    );
  }

  async patchItem(
    vaultId: string,
    itemId: string,
    operations: JsonPatchOperation[]
  ): Promise<Item> {
    return this.request<Item>(
      `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: JSON.stringify(operations),
      }
    );
  }

  async deleteItem(vaultId: string, itemId: string): Promise<void> {
    await this.request<void>(
      `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ===========================================================================
  // Files
  // ===========================================================================

  async listFiles(
    vaultId: string,
    itemId: string,
    inlineContent?: boolean
  ): Promise<ItemFile[]> {
    const queryParams = new URLSearchParams();
    if (inlineContent !== undefined) {
      queryParams.set('inline_content', String(inlineContent));
    }
    const query = queryParams.toString();
    const endpoint = query
      ? `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/files?${query}`
      : `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/files`;
    return this.request<ItemFile[]>(endpoint);
  }

  async getFile(
    vaultId: string,
    itemId: string,
    fileId: string,
    inlineContent?: boolean
  ): Promise<ItemFile> {
    const queryParams = new URLSearchParams();
    if (inlineContent !== undefined) {
      queryParams.set('inline_content', String(inlineContent));
    }
    const query = queryParams.toString();
    const endpoint = query
      ? `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/files/${encodeURIComponent(fileId)}?${query}`
      : `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/files/${encodeURIComponent(fileId)}`;
    return this.request<ItemFile>(endpoint);
  }

  async getFileContent(vaultId: string, itemId: string, fileId: string): Promise<ArrayBuffer> {
    return this.requestRaw(
      `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/files/${encodeURIComponent(fileId)}/content`
    );
  }

  // ===========================================================================
  // Activity
  // ===========================================================================

  async listActivity(params?: PaginationParams): Promise<PaginatedResponse<APIRequest>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) {
      queryParams.set('limit', String(params.limit));
    }
    if (params?.offset) {
      queryParams.set('offset', String(params.offset));
    }
    const query = queryParams.toString();
    const endpoint = query ? `/activity?${query}` : '/activity';
    const items = await this.request<APIRequest[]>(endpoint);

    // The API returns an array, we wrap it in pagination format
    return {
      items,
      count: items.length,
      hasMore: false, // The API doesn't provide pagination info directly
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a 1Password Connect client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createOnePasswordClient(credentials: TenantCredentials): OnePasswordClient {
  return new OnePasswordClientImpl(credentials);
}
