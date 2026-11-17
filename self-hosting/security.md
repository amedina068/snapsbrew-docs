---
title: Security
description: The security controls of Snapsbrew and the settings that a self-hosted instance must get right.
order: 10
---

# Security

This page lists the controls that Snapsbrew has and the settings that you must get right on a public instance.

## Checklist for a public instance

1. Set `APP_ENV=production` and `APP_DEBUG=false`.
2. Keep `APP_KEY` secret, and keep a copy in your backups.
3. Serve the app over HTTPS. Read [Reverse proxy and TLS](reverse-proxy-and-tls.md).
4. Keep the Browserless port inside a private network.
5. Keep `REGISTRATION_ENABLED=false`, unless you want anyone to sign up.
6. Keep `MCP_REDIRECT_DOMAINS` at the hosts of the connectors that you accept.
7. Keep `SNAPSBREW_FREE_TOOLS_ENABLED=false`, unless a marketing site needs the free tools.
8. If the instance is public, publish your own privacy policy and terms. Set `SNAPSBREW_PRIVACY_URL` and `SNAPSBREW_TERMS_URL`.

## Debug mode and the environment

With `APP_DEBUG=true`, an error page shows the code, the settings and the request. Never use it on a public instance.

With `APP_ENV=local`, Horizon lets every visitor open `/horizon`. Use `APP_ENV=production` on a server. Read [Queues and Horizon](queues-and-horizon.md).

## The owner areas

Only the owner can open `/admin` and `/horizon`. `/admin` returns 404 to every other visitor, so a visitor cannot see that the area exists.

## Authentication

| Surface | Credential |
|---|---|
| Web app | Email and password, with optional two-factor authentication (TOTP). |
| REST API | An API token with the `api_requests` ability, sent as a bearer token. |
| MCP server | An API token with `api_requests`, or an OAuth access token with the `mcp:use` scope. |
| Signed URLs | An HMAC-SHA256 signature made with a signed-URL key. The key has the `signed_url` ability only. |
| Embedded forms | A Laravel URL signature in the form URL. |
| Creative package files | A Laravel URL signature that expires. |

A deactivated user cannot use any of these credentials. Read [Accounts and registration](accounts-and-registration.md).

## Rate limits

| Limiter | Limit | Applies to |
|---|---|---|
| `login` | 5 a minute, for each email and IP address | The login form. |
| `two-factor` | 5 a minute, for each login attempt | The two-factor challenge. |
| Setup | 10 a minute | `/setup`. |
| `api` | 60 a minute, for each user (for each IP address when there is no user) | Every route in `routes/api.php`, and the creative package file URLs. |
| `preview` | 10 a minute, for each user or IP address | `GET /v1/templates/{uuid}/preview` and `GET /v1/snaps/preview`. |
| `mcp` | 30 a minute, for each user or IP address | `/mcp`. |
| `editor-document` | 30 a minute for each user, 180 a minute for each company | The editor document routes of the API. |

The submit route of an embedded form has no rate limit. Read [API overview](../api/overview.md) for the limits of each route.

## URLs that the renderer loads

Snapsbrew sends user values to headless Chrome. The app checks each URL before Chrome loads it:

- An image URL in a variant, a webhook URL, a screenshot URL and an imported image URL must be `http` or `https`.
- The host must resolve to public IP addresses only. The app refuses private, loopback, link-local and reserved ranges. This includes the cloud metadata address `169.254.169.254`.
- The host of `APP_URL` is always accepted, even when it resolves to a private address.

This check runs before the render. Chrome resolves the host again when it loads the URL, so the check does not stop DNS rebinding. For more protection, block the private networks in the firewall of the renderer host.

The variants of a signed URL go through the same rules as the REST API and the MCP server. The app also checks the colors and the CSS values of the layers.

## Browserless

WARNING: The Browserless token is the only protection of Browserless. A person who reaches its port with the token can control Chrome and read files through `file://` URLs.

- In `docker-compose.yml`, Browserless publishes no port.
- In `deploy/browserless/docker-compose.yml`, the port binds to `127.0.0.1` only.
- If the app and Browserless run on different hosts, connect them through a private network.

Never put the token in a commit. Docker Compose reads it from `.env`.

## The MCP OAuth flow

`POST /oauth/register` is open to every client. A connector must register itself before any user of the instance knows it. `MCP_REDIRECT_DOMAINS` controls where an authorization code can go.

CAUTION: Do not set `MCP_REDIRECT_DOMAINS` to `*`. With `*`, an attacker can register a client that sends the code to a host of the attacker. When a user approves the consent screen, the attacker gets a token.

PKCE does not stop this attack, because the attacker is the client. An MCP client that is not in the list can still connect with an API token. Read [OAuth](../mcp/oauth.md).

## Embedded forms in iframes

The embedded form page sends `Content-Security-Policy: frame-ancestors *`. Every site can show the form in an iframe. The form renders only the layers that the form owner selected.

## Previews

When `SNAPSBREW_PREVIEW_WATERMARK` is `true`, the previews of the REST API and the MCP server show a "PREVIEW" overlay. A preview is not a final image. On a private instance, you can set it to `false`.

## Usage log

Each API request and each render is in the usage log. The usage log stores the request and the response bodies. Treat the database as sensitive data.

## Report a security problem

Do not open a public issue for a security problem. Send the details to the maintainer privately, through the contact on the GitHub profile of the repository owner.

TODO(owner): Do you want a `SECURITY.md` file with a private email address or GitHub private vulnerability reporting?
