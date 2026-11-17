---
title: Connect Cursor and other clients
description: Connect Cursor, Codex CLI and other MCP clients to a Snapsbrew instance with an API token or with OAuth.
order: 3
---

# Connect Cursor and other clients

Most MCP clients connect with an API token in a configuration file. A client that supports OAuth 2.0 can also connect without a token. Read [OAuth with a desktop client](#oauth-with-a-desktop-client).

The examples use the host `https://snapsbrew.example`. Replace it with the `APP_URL` of your instance.

## Before you start

1. Make sure that `MCP_ENABLED` is `true` on the instance.
2. Open **Account > Developers**.
3. Click **New token** to create an API token.
4. Copy the token when it appears.

The token is a Sanctum personal access token with the `api_requests` ability. The REST API uses the same token.

## Cursor

1. Open `~/.cursor/mcp.json`, or the `mcp.json` file of the project.
2. Add this server entry. Replace `<your-token>` with your API token.

   ```json
   {
     "mcpServers": {
       "snapsbrew": {
         "url": "https://snapsbrew.example/mcp",
         "headers": {
           "Authorization": "Bearer <your-token>"
         }
       }
     }
   }
   ```

3. Reload Cursor.

## Codex CLI

1. Open `~/.codex/config.toml`.
2. Add this server block. Replace `<your-token>` with your API token.

   ```toml
   [mcp_servers.snapsbrew]
   url = "https://snapsbrew.example/mcp"

   [mcp_servers.snapsbrew.http_headers]
   Authorization = "Bearer <your-token>"
   ```

## Other clients

The server uses the Streamable HTTP transport. A client needs three values:

| Value | Example |
| --- | --- |
| Name | `snapsbrew` |
| URL | `https://snapsbrew.example/mcp` |
| Header | `Authorization: Bearer <your-token>` |

If a client supports only the stdio transport, use the `mcp-remote` bridge. The bridge needs Node. Read [Claude Desktop](connect-claude.md#claude-desktop) for an example.

## OAuth with a desktop client

A desktop client can call back on a private URI scheme, for example `cursor://`. The instance refuses such a scheme by default.

To accept a scheme, the owner adds it to `MCP_CUSTOM_SCHEMES`. The value is a comma-separated list of scheme names:

```dotenv
MCP_CUSTOM_SCHEMES=cursor
```

CAUTION: Add a scheme only for a client that you trust. The instance accepts a listed scheme with any host. `MCP_REDIRECT_DOMAINS` cannot limit it.

A redirect URI with a custom scheme must also have a host. Read [OAuth for the MCP server](oauth.md).

TODO(owner): Which desktop clients do we support with OAuth, and which scheme does each one use?

## Develop a connector on your computer

If you develop a connector on your computer, its callback is on `localhost`. Add `http://localhost` to `MCP_REDIRECT_DOMAINS`:

```dotenv
MCP_REDIRECT_DOMAINS=https://claude.ai,https://claude.com,http://localhost
```

With a local host in the list, the instance accepts a redirect URI that starts with `http://localhost:`, `http://localhost/`, `http://127.0.0.1:`, `http://127.0.0.1/`, `http://[::1]:` or `http://[::1]/`.

Do not add `http://localhost` on a public instance.

## Make sure that the connection works

1. Ask the agent to call `whoami`.
2. If the call fails with `401`, make sure that the token is correct.
3. If the call fails with `403`, make sure that the token has the `api_requests` ability.
4. If the call fails with `429`, wait one minute. The server allows 30 requests each minute.

## Related pages

- [MCP server](overview.md)
- [Connect Claude](connect-claude.md)
- [OAuth for the MCP server](oauth.md)
- [MCP tools reference](tools-reference.md)
