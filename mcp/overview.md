---
title: MCP server
description: How an AI agent connects to Snapsbrew over the Model Context Protocol, and the workflow and error format of the server.
order: 1
---

# MCP server

Snapsbrew includes a Model Context Protocol (MCP) server. An AI agent, for example Claude, Cursor or Codex, can use it to read templates, preview snaps and render the final images.

The server uses the same data and the same rules as the [REST API](../api/overview.md). A snap that an agent renders goes into the usage log of the account, the same as a snap from the REST API.

## Connection facts

| Item | Value |
| --- | --- |
| Endpoint | `https://snapsbrew.example/mcp` (the `APP_URL` of the instance, followed by `/mcp`) |
| Transport | Streamable HTTP. The route accepts `GET`, `POST` and `DELETE`. |
| Authentication | An API token, or an OAuth 2.0 access token. |
| Rate limit | 30 requests each minute, for each user. |
| Server name and version | `Snapsbrew`, `1.0.0` |

The rate limit comes from the `mcp` rate limiter in `App\Providers\RouteServiceProvider`. The limiter counts by user. If the request has no user, it counts by IP address.

## Turn the server on or off

The `MCP_ENABLED` variable controls the server. The default value is `true`.

If `MCP_ENABLED` is `false`, the instance has:

- no `/mcp` route
- no OAuth discovery document and no OAuth route
- no MCP setup on the account page

The REST API continues to work.

## Authentication

The server accepts two types of credential on one route. `App\Http\Middleware\EnsureMcpAccess` reads the credential that matched:

- **An API token.** This is a Sanctum personal access token with the `api_requests` ability. It is the same token that the REST API uses. Send it in the `Authorization: Bearer <your-token>` header.
- **An OAuth 2.0 access token** with the `mcp:use` scope. A connector, for example the Claude connector, gets this token through the authorization code flow with PKCE.

If the token has neither the ability nor the scope, the server returns the same error as the REST API for a missing ability. If the user of the token is deactivated, the server refuses the token.

Read [OAuth for the MCP server](oauth.md) for the OAuth flow and its settings.

## Connect a client

- [Connect Claude](connect-claude.md): Claude Code, Claude Desktop and the Claude connector.
- [Connect Cursor and other clients](connect-cursor-and-others.md): Cursor, Codex CLI and other MCP clients.

Each user can also find the setup on the account page. Open **Account > Developers** and go to **Connect via MCP**. The page shows the server URL, the authorization header and a configuration example for each client. The token that you paste on that page stays in the browser.

## Tools

The server has 27 tools. A `tools/list` call returns all of them on one page, because the server sets the page size to 30.

Read the [MCP tools reference](tools-reference.md) for the name, the description and the arguments of each tool.

## The workflow

The server sends a workflow to the agent as its instructions. The same text is available at `https://snapsbrew.example/skill.md` as an Agent Skill file. Both come from the constant `SnapsbrewServer::WORKFLOW`.

The main steps of the workflow are:

1. Call `whoami` to make sure that the token works.
2. Call `list-templates` to find a template and its id.
3. Call `get-template-details` to read the layer keys of the template.
4. Call `preview-template` or `preview-snap` to get a watermarked HTML preview.
5. Show the preview to the person. Change the `variants` until the person approves the preview.
6. Call `create-snap` with the same `variants` to get the final image.

### Previews

A preview renders no image and stores no snap. It returns watermarked HTML. The `SNAPSBREW_PREVIEW_WATERMARK` variable controls the "PREVIEW" overlay. Read [Configuration](../self-hosting/configuration.md).

### Draft and published versions

`edit-template` writes the draft of a template. New snaps and previews render the last published version. Thus an edit has no effect until the agent calls `publish-template`. `get-template-details` reports `has_unpublished_edits: true` when the draft is not the same as the published version.

### Designs with no template

`preview-design` renders a canvas and a `layers` definition with no saved template. `create-snap-from-design` renders the final image from the same canvas and layers. The snap has no template, so its `template_id` is null.

### Batches

`create-snaps-batch` renders up to 100 snaps from one template in one call. It returns a batch id immediately and renders the items in the background. `get-snaps-batch` reads the progress. `cancel-snaps-batch` stops a running batch. Read [Batches](../using-snapsbrew/batches.md).

### Creative packages

`export-creative-package` renders up to 10 final images from published template versions into one package. `get-creative-package` reads the package. Each response has a `status` and a `next_action`:

| `status` | `next_action` | What the agent does |
| --- | --- | --- |
| `building` | `poll` | Waits `poll_after_seconds`, then calls `get-creative-package` again. |
| `ready` | `download` | Reads `file_url` on each manifest item and saves each file. |
| `partial` | `retry_incomplete` | Saves the ready files, then follows the retry rule for the failed items. |
| `failed` | `inspect_failures` | Reads `failure` on each item, then follows the retry rule. |

Read [Creative packages](../using-snapsbrew/creative-packages.md).

## Errors

When a tool fails, it returns one JSON object:

```json
{
  "error": {
    "code": "template_not_found",
    "message": "No template with id `a1b2` exists in your account.",
    "fix": "Call `list-templates` to read the template ids in your account. Then call this tool again with an id from that list.",
    "retryable": false,
    "details": { "template_id": "a1b2" }
  }
}
```

| Field | Meaning |
| --- | --- |
| `code` | A stable identifier. Branch on this value. |
| `message` | What went wrong, for the person. The words can change. |
| `fix` | The next call to make. It names the tool and the change. |
| `retryable` | `true` only when the same call can succeed later without a change. |
| `details` | The values that the agent sent, and the choices that it can use. The field is absent when there is nothing to add. |

`App\Mcp\ToolError` builds these objects.

## Test the server locally

The account page suggests the MCP Inspector for a local test:

```bash
php artisan mcp:inspector mcp
```

## Related pages

- [Connect Claude](connect-claude.md)
- [Connect Cursor and other clients](connect-cursor-and-others.md)
- [MCP tools reference](tools-reference.md)
- [OAuth for the MCP server](oauth.md)
