/**
 * 1Password Connect API Entity Types
 *
 * Type definitions for 1Password Connect API entities.
 */

// =============================================================================
// Vault
// =============================================================================

export interface Vault {
  /** Unique identifier for the vault */
  id: string;
  /** Name of the vault */
  name: string;
  /** Description of the vault */
  description?: string;
  /** Number of items in the vault */
  items?: number;
  /** Type of vault */
  type?: 'USER_CREATED' | 'PERSONAL' | 'EVERYONE';
  /** Vault attributes version */
  attributeVersion?: number;
  /** Content version */
  contentVersion?: number;
  /** When the vault was created */
  createdAt?: string;
  /** When the vault was last updated */
  updatedAt?: string;
}

// =============================================================================
// Item
// =============================================================================

export type ItemCategory =
  | 'LOGIN'
  | 'SECURE_NOTE'
  | 'CREDIT_CARD'
  | 'IDENTITY'
  | 'PASSWORD'
  | 'DOCUMENT'
  | 'API_CREDENTIAL'
  | 'DATABASE'
  | 'BANK_ACCOUNT'
  | 'CUSTOM'
  | 'DRIVER_LICENSE'
  | 'EMAIL_ACCOUNT'
  | 'MEMBERSHIP'
  | 'OUTDOOR_LICENSE'
  | 'PASSPORT'
  | 'REWARD_PROGRAM'
  | 'SERVER'
  | 'SOCIAL_SECURITY_NUMBER'
  | 'SOFTWARE_LICENSE'
  | 'SSH_KEY'
  | 'WIRELESS_ROUTER';

export type FieldType =
  | 'STRING'
  | 'CONCEALED'
  | 'EMAIL'
  | 'URL'
  | 'OTP'
  | 'DATE'
  | 'MONTH_YEAR'
  | 'PHONE'
  | 'MENU'
  | 'FILE'
  | 'ADDRESS'
  | 'CREDIT_CARD_TYPE'
  | 'CREDIT_CARD_NUMBER'
  | 'REFERENCE'
  | 'SSHKEY';

export type FieldPurpose = 'USERNAME' | 'PASSWORD' | 'NOTES';

export interface ItemField {
  /** Unique identifier for the field */
  id: string;
  /** Type of the field */
  type?: FieldType;
  /** Purpose of the field (USERNAME, PASSWORD, NOTES) */
  purpose?: FieldPurpose;
  /** Label displayed for the field */
  label?: string;
  /** Value of the field */
  value?: string;
  /** Whether this field should be used for autofill */
  generate?: boolean;
  /** Recipe for password generation */
  recipe?: PasswordRecipe;
  /** Entropy of the field value */
  entropy?: number;
  /** Reference to another item/field */
  reference?: string;
  /** Section ID this field belongs to */
  section?: { id: string };
}

export interface PasswordRecipe {
  /** Length of the generated password */
  length?: number;
  /** Character sets to include */
  characterSets?: ('LETTERS' | 'DIGITS' | 'SYMBOLS')[];
  /** Characters to exclude */
  excludeCharacters?: string;
}

export interface ItemSection {
  /** Unique identifier for the section */
  id: string;
  /** Label for the section */
  label?: string;
}

export interface ItemUrl {
  /** Label for the URL */
  label?: string;
  /** Whether this is the primary URL */
  primary?: boolean;
  /** The URL */
  href: string;
}

export interface Item {
  /** Unique identifier for the item */
  id: string;
  /** Title of the item */
  title: string;
  /** Category of the item */
  category: ItemCategory;
  /** Vault reference */
  vault: { id: string; name?: string };
  /** URLs associated with the item */
  urls?: ItemUrl[];
  /** Whether the item is marked as favorite */
  favorite?: boolean;
  /** Tags for the item */
  tags?: string[];
  /** Version of the item */
  version?: number;
  /** State of the item */
  state?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  /** When the item was created */
  createdAt?: string;
  /** When the item was last updated */
  updatedAt?: string;
  /** Who last edited the item */
  lastEditedBy?: string;
  /** Sections in the item */
  sections?: ItemSection[];
  /** Fields in the item */
  fields?: ItemField[];
  /** Files attached to the item */
  files?: ItemFile[];
}

export interface ItemCreateInput {
  /** Title of the item */
  title: string;
  /** Category of the item */
  category: ItemCategory;
  /** Vault to create the item in */
  vault: { id: string };
  /** URLs associated with the item */
  urls?: ItemUrl[];
  /** Whether the item is marked as favorite */
  favorite?: boolean;
  /** Tags for the item */
  tags?: string[];
  /** Sections in the item */
  sections?: ItemSection[];
  /** Fields in the item */
  fields?: ItemField[];
}

export interface ItemUpdateInput {
  /** Unique identifier for the item */
  id: string;
  /** Title of the item */
  title?: string;
  /** Category of the item */
  category?: ItemCategory;
  /** Vault reference */
  vault: { id: string };
  /** URLs associated with the item */
  urls?: ItemUrl[];
  /** Whether the item is marked as favorite */
  favorite?: boolean;
  /** Tags for the item */
  tags?: string[];
  /** Sections in the item */
  sections?: ItemSection[];
  /** Fields in the item */
  fields?: ItemField[];
}

// =============================================================================
// File
// =============================================================================

export interface ItemFile {
  /** Unique identifier for the file */
  id: string;
  /** Name of the file */
  name: string;
  /** Size of the file in bytes */
  size?: number;
  /** Path to retrieve the file content */
  content_path?: string;
  /** MIME type of the file */
  content_type?: string;
  /** Section the file belongs to */
  section?: { id: string };
  /** Base64-encoded content (when inline_content=true) */
  content?: string;
}

// =============================================================================
// Activity
// =============================================================================

export interface APIRequest {
  /** Unique identifier for the request */
  requestId?: string;
  /** Timestamp of the request */
  timestamp?: string;
  /** Action performed */
  action?: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';
  /** Result of the request */
  result?: 'SUCCESS' | 'DENY';
  /** Actor who made the request */
  actor?: {
    /** Actor ID */
    id: string;
    /** Account ID */
    account?: string;
    /** JWT subject */
    jwtSub?: string;
    /** User agent */
    userAgent?: string;
    /** IP address */
    requestIp?: string;
  };
  /** Resource accessed */
  resource?: {
    /** Type of resource */
    type?: 'ITEM' | 'VAULT';
    /** Vault ID */
    vault?: { id: string };
    /** Item ID */
    item?: { id: string };
    /** Item version */
    itemVersion?: number;
  };
}

// =============================================================================
// Health
// =============================================================================

export interface ServerHealth {
  /** Name of the server */
  name?: string;
  /** Version of the server */
  version?: string;
  /** Dependencies status */
  dependencies?: ServerDependency[];
}

export interface ServerDependency {
  /** Name of the dependency */
  service?: string;
  /** Status of the dependency */
  status?: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  /** Additional message */
  message?: string;
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
  /** Number of items to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Number of items in this response */
  count: number;
  /** Total count (if available) */
  total?: number;
  /** Whether more items are available */
  hasMore: boolean;
  /** Next offset for pagination */
  nextOffset?: number;
}

// =============================================================================
// JSON Patch (RFC 6902)
// =============================================================================

export interface JsonPatchOperation {
  /** Operation type */
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  /** JSON Pointer path */
  path: string;
  /** Value for add/replace/test operations */
  value?: unknown;
  /** From path for move/copy operations */
  from?: string;
}

// =============================================================================
// Response Format
// =============================================================================

export type ResponseFormat = 'json' | 'markdown';
