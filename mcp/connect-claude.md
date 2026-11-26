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

1. Export the token in a terminal. Replace `<your-token>` with your API token:

   ```bash
   export SNAPSBREW_TOKEN='<your-token>'
   ```

2. In the same terminal, add the server. The command reads the token from `SNAPSBREW_TOKEN`, so the token is not in the command text or in the shell history:

   ```bash
   claude mcp add --transport http snapsbrew https://snapsbrew.example/mcp \
     --header "Authorization: Bearer ${SNAPSBREW_TOKEN}"
   ```

3. Restart the Claude Code session.
4. Ask Claude to call the `whoami` tool. The tool returns your account and your company.

On the server, `php artisan snapsbrew:mcp:connect --client=claude` prints the same two lines with the URL of your instance. Add `--token=new` to make a new token. The token is only in the export line.

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

The configuration file is `claude_desktop_config.json`:

| Operating system | Path |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

To open the file from Claude Desktop, open **Settings > Developer** and click **Edit Config**. If the file does not exist, Claude Desktop creates it.

## Claude custom connector

A connector uses OAuth 2.0. You do not paste a token. The connector registers itself and then asks you to approve the connection.

### Prepare the instance

The owner of the instance does these steps one time.

1. Make sure that the Passport keys exist. Read [OAuth for the MCP server](oauth.md#passport-keys).
2. Make sure that `MCP_REDIRECT_DOMAINS` includes the Claude hosts. The default value is `https://claude.ai,https://claude.com`.
3. Make sure that the instance is reachable from the public internet over HTTPS, with a certificate that a browser trusts.

The Claude custom connector connects from the servers of Anthropic, not from your computer. A firewall, a VPN or an IP allowlist in front of `/mcp`, `/oauth/` or `/.well-known/` blocks the connector. If the instance is on a private network, use [Claude Code](#claude-code) or [Claude Desktop](#claude-desktop) with an API token. These clients connect from your computer.

### Add the connector

1. In Claude, open **Settings > Connectors**.
2. Click **Add custom connector**.
3. Type a name, for example `Snapsbrew`, and the URL `https://snapsbrew.example/mcp`. Then click **Add**.
4. Click **Connect** next to the new connector.
5. If the browser asks you to sign in to Snapsbrew, sign in.
6. Read the consent screen. It shows the name that the client gave itself, and what the client can do.
7. To approve the connection, click **Connect**. To refuse it, click **Cancel**.

The consent screen tells you that Snapsbrew did not review the application. Approve it only if you started the connection yourself.

On a Team or an Enterprise plan, an owner of the Claude organization adds the custom connector first, in the settings of the organization. Then each member does steps 4 to 7.

Claude can change the names of these menus. The URL and the consent screen stay the same.

## Make sure that the connection works

1. Ask Claude to call `whoami`.
2. Ask Claude to call `list-templates`.
3. If a call fails, read the `error.code` and `error.fix` fields. Read [MCP server](overview.md#errors).

## Related pages

- [MCP server](overview.md)
- [OAuth for the MCP server](oauth.md)
- [MCP tools reference](tools-reference.md)
