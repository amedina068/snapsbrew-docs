---
title: Connect Claude
description: Connect Claude Code, Claude Desktop or the Claude connector to the MCP server of a Snapsbrew instance.
order: 2
---

# Connect Claude

You can connect Claude to the MCP server in three ways:

| Client | Credential | Section |
| --- | --- | --- |
| Claude Code | API token | [Claude Code](#claude-code) |
| Claude Desktop | API token, through `mcp-remote` | [Claude Desktop](#claude-desktop) |
| Claude custom connector | OAuth 2.0 | [Claude custom connector](#claude-custom-connector) |

The examples use the host `https://snapsbrew.example`. Replace it with the `APP_URL` of your instance.

## Before you start

- Make sure that the MCP server is on. `MCP_ENABLED` must be `true`. Read [MCP server](overview.md).
- For Claude Code and Claude Desktop, create an API token. Open **Account > Developers** and click **New token**. Copy the token when it appears.

## Claude Code

1. Run this command in a terminal. Replace `<your-token>` with your API token.

   ```bash
   claude mcp add --transport http snapsbrew https://snapsbrew.example/mcp \
     --header "Authorization: Bearer <your-token>"
   ```

2. Restart the Claude Code session.
3. Ask Claude to call the `whoami` tool. The tool returns your account and your company.

## Claude Desktop

Claude Desktop connects through `mcp-remote`. The `mcp-remote` bridge needs Node.

1. Open the MCP configuration file of Claude Desktop.
2. Add this server entry. Replace `<your-token>` with your API token.

   ```json
   {
     "mcpServers": {
       "snapsbrew": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "https://snapsbrew.example/mcp",
           "--header",
           "Authorization: Bearer <your-token>"
         ]
       }
     }
   }
   ```

3. Restart Claude Desktop.

TODO(owner): Which path of the Claude Desktop configuration file do we document for each operating system?

## Claude custom connector

A connector uses OAuth 2.0. You do not paste a token. The connector registers itself and then asks you to approve the connection.

### Prepare the instance

The owner of the instance does these steps one time.

1. Make sure that the Passport keys exist. Read [OAuth for the MCP server](oauth.md#passport-keys).
2. Make sure that `MCP_REDIRECT_DOMAINS` includes the Claude hosts. The default value is `https://claude.ai,https://claude.com`.

TODO(owner): Must the instance be reachable from the public internet for the Claude connector? Do we document this requirement?

### Add the connector

1. In Claude, add a custom connector.
2. Use `https://snapsbrew.example/mcp` as the URL.
3. If the browser asks you to sign in to Snapsbrew, sign in.
4. Read the consent screen. It shows the name that the client gave itself, and what the client can do.
5. To approve the connection, click **Connect**. To refuse it, click **Cancel**.

The consent screen tells you that Snapsbrew did not review the application. Approve it only if you started the connection yourself.

TODO(owner): What are the exact menu names in Claude to add a custom connector? The app code does not name them.

## Make sure that the connection works

1. Ask Claude to call `whoami`.
2. Ask Claude to call `list-templates`.
3. If a call fails, read the `error.code` and `error.fix` fields. Read [MCP server](overview.md#errors).

## Related pages

- [MCP server](overview.md)
- [OAuth for the MCP server](oauth.md)
- [MCP tools reference](tools-reference.md)
