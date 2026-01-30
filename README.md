# 1Password MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with 1Password. Securely manage vaults, items, files, and monitor activity through the 1Password Connect server.

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-6366f1)](https://primrose.dev/mcp/1password)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[View on Primrose](https://primrose.dev/mcp/1password)** | **[Documentation](https://primrose.dev/docs)**

---

## Features

- **Vaults** - List and retrieve vault information
- **Items** - Create, read, update, and delete password entries and secure notes
- **Files** - Manage file attachments in vault items
- **Activity** - Monitor and audit vault activity
- **Health** - Check 1Password Connect server health status

## Quick Start

### Using Primrose SDK (Recommended)

The fastest way to get started is with the [Primrose SDK](https://github.com/primrose-mcp/primrose-sdk), which handles authentication and provides tool definitions formatted for your LLM provider.

```bash
npm install primrose-mcp
```

```typescript
import { Primrose } from 'primrose-mcp';

const primrose = new Primrose({
  apiKey: 'prm_xxxxx',
  provider: 'anthropic', // or 'openai', 'google', 'amazon', etc.
});

// List available 1Password tools
const tools = await primrose.listTools({ mcpServer: '1password' });

// Call a tool
const result = await primrose.callTool('1password_list_vaults', {
  format: 'json'
});
```

[Get your Primrose API key](https://primrose.dev) to start building.

### Manual Installation

If you prefer to self-host, you can deploy this MCP server directly to Cloudflare Workers.

```bash
git clone https://github.com/primrose-mcp/primrose-mcp-1password.git
cd primrose-mcp-1password
bun install
bun run deploy
```

## Configuration

This server uses a multi-tenant architecture where credentials are passed via request headers.

### Required Headers

| Header | Description |
|--------|-------------|
| `X-1Password-Connect-Token` | Bearer token for 1Password Connect server |
| `X-1Password-Connect-Host` | URL of the Connect server (e.g., `http://localhost:8080`) |

### Getting Credentials

1. Set up a [1Password Connect server](https://developer.1password.com/docs/connect/)
2. Create a Connect server token from the 1Password admin console
3. Note your Connect server URL

## Available Tools

### Vaults
- `1password_list_vaults` - List all accessible vaults
- `1password_get_vault` - Get detailed vault information

### Items
- `1password_list_items` - List items in a vault
- `1password_get_item` - Get item details
- `1password_create_item` - Create a new item
- `1password_update_item` - Update an existing item
- `1password_delete_item` - Delete an item

### Files
- `1password_list_files` - List file attachments
- `1password_get_file` - Get file content

### Activity
- `1password_get_activity` - Get vault activity logs

### Health
- `1password_health_check` - Check Connect server health

## Development

```bash
bun run dev
bun run typecheck
bun run lint
bun run inspector
```

## Related Resources

- [Primrose SDK](https://github.com/primrose-mcp/primrose-sdk)
- [1Password Connect API Documentation](https://developer.1password.com/docs/connect/)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT License - see [LICENSE](LICENSE) for details.
