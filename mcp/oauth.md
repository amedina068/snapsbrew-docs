---
title: OAuth for the MCP server
description: The OAuth 2.0 flow, the endpoints, the token lifetimes and the settings that let a connector use the MCP server without an API token.
order: 5
---

# OAuth for the MCP server

A connector, for example the Claude connector, connects to the MCP server with OAuth 2.0. The person approves the connection on a consent screen. The connector then holds its own access token. The person does not paste an API token.

Laravel Passport is the authorization server. The `laravel/mcp` package adds the discovery documents and the client registration endpoint.

If `MCP_ENABLED` is `false`, the instance registers none of the routes on this page.

## The flow

1. The connector calls `https://snapsbrew.example/mcp` with no token.
2. The server answers `401` with a `WWW-Authenticate` header. The header points to the protected resource document.
3. The connector reads the two discovery documents.
4. The connector registers itself with `POST /oauth/register`.
5. The connector sends the person to `/oauth/authorize`, with a PKCE code challenge.
6. The person signs in, if necessary, and approves the connection on the consent screen.
7. The instance sends an authorization code to the redirect URI of the connector.
8. The connector exchanges the code for an access token and a refresh token at `/oauth/token`.
9. The connector calls `/mcp` with `Authorization: Bearer <access token>`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/.well-known/oauth-protected-resource` | Protected resource metadata (RFC 9728). |
| `GET` | `/.well-known/oauth-authorization-server` | Authorization server metadata (RFC 8414). |
| `POST` | `/oauth/register` | Dynamic client registration (RFC 7591). |
| `GET` | `/oauth/authorize` | The consent screen. |
| `POST` | `/oauth/authorize` | Approve the request. |
| `DELETE` | `/oauth/authorize` | Refuse the request. |
| `POST` | `/oauth/token` | Exchange a code or a refresh token for tokens. |

Each discovery document also answers on a path with a suffix, for example `/.well-known/oauth-protected-resource/mcp`.

### Authorization server metadata

The authorization server document contains these values:

| Field | Value |
| --- | --- |
| `issuer` | `MCP_AUTHORIZATION_SERVER`, or the root URL of the instance |
| `authorization_endpoint` | `https://snapsbrew.example/oauth/authorize` |
| `token_endpoint` | `https://snapsbrew.example/oauth/token` |
| `registration_endpoint` | `https://snapsbrew.example/oauth/register` |
| `response_types_supported` | `code` |
| `code_challenge_methods_supported` | `S256` |
| `scopes_supported` | `mcp:use` |
| `grant_types_supported` | `authorization_code`, `refresh_token` |

The instance turns off the Passport device code grant.

## Scope

The server has one scope, `mcp:use`. The consent screen shows this description of the scope:

> Create and read snaps, templates and batches for your company

## Token lifetimes

| Token | Lifetime |
| --- | --- |
| Access token | 15 days |
| Refresh token | 6 months |

Passport rotates the refresh token each time that the connector uses it. `App\Providers\AuthServiceProvider` sets these values.

## Client registration

`POST /oauth/register` has no authentication. The MCP specification requires this, because a connector must register before a person sees it.

The endpoint creates a public client. A public client has no client secret. The request must contain `redirect_uris`, a list with one URI or more. It can contain `client_name`. If the name is absent, the instance uses the host of the first redirect URI.

The instance accepts a redirect URI only in these cases:

- The URI is `http` or `https`, and it starts with a host in `MCP_REDIRECT_DOMAINS`.
- `MCP_REDIRECT_DOMAINS` contains a local host, and the URI is on `localhost`, `127.0.0.1` or `[::1]`.
- The URI uses a scheme in `MCP_CUSTOM_SCHEMES`, and it has a host.

If a redirect URI is not accepted, the endpoint returns the error `invalid_redirect_uri`.

The endpoint also has these limits:

- One IP address can register 3 clients each minute and 20 each day. Then the endpoint returns `429`.
- A request can have 5 redirect URIs or fewer. Each URI can have 2000 characters or fewer. Otherwise the endpoint returns `400` with `invalid_redirect_uri`.
- The request body can be 16 KB or less. Otherwise the endpoint returns `413` with `invalid_client_metadata`.

The scheduler runs `php artisan oauth-clients:prune` every day. The command deletes each registered client that got no access token in 7 days.

## Redirect domains

`MCP_REDIRECT_DOMAINS` is a comma-separated list of scheme and host pairs. The default value is `https://claude.ai,https://claude.com`.

This list is the control that replaces authentication on the registration endpoint. It decides where the instance can send an authorization code.

WARNING: Do not set `MCP_REDIRECT_DOMAINS` to `*`. With `*`, an attacker can register a client with a name that looks official. The attacker points the redirect at a host that they own. If a person approves that client, the attacker gets the code. PKCE does not stop this attack, because the attacker is the client.

Keep the list at the hosts of the connectors that you accept. A client that is not on the list can use an API token instead. Read [Connect Cursor and other clients](connect-cursor-and-others.md).

## The consent screen

The consent screen shows:

- the name that the client gave itself
- a statement that the instance did not review the application
- the description of the `mcp:use` scope
- a statement that each snap the client renders goes into the usage log of the account
- the name and email of the person who signs in

The person clicks **Connect** to approve, or **Cancel** to refuse.

## Passport keys

Passport signs the tokens with an RSA key pair. You can give the keys in one of two ways:

- Key files in `storage/`. If the files are missing, `php artisan snapsbrew:install` runs `php artisan passport:keys`. The Docker `web` container runs `php artisan snapsbrew:install --prepare` at each start.
- The variables `PASSPORT_PRIVATE_KEY` and `PASSPORT_PUBLIC_KEY`. With these variables, the instance needs no key files.

To create the key files by hand, run:

```bash
php artisan passport:keys
```

`PASSPORT_CONNECTION` sets the database connection of the Passport tables. If it is empty, Passport uses the default connection.

CAUTION: Keep the private key secret. If you change the key pair, the instance cannot read the tokens that it signed with the old keys.

TODO(owner): After a key change, must each connector connect again? Do we document a key rotation procedure?

## Authorization server

`MCP_AUTHORIZATION_SERVER` sets the issuer that the two discovery documents report. If it is empty, the documents report the root URL of the instance. This is correct when the authorization server and the MCP server use the same domain.

## Deactivated users

The Passport guard finds a user through a provider that does not return a deactivated user. Thus an OAuth token of a deactivated user does not authenticate. If the owner reactivates the user, the tokens work again. Read [Accounts and registration](../self-hosting/accounts-and-registration.md).

## End a connection

The consent screen tells the person that they can end the connection from the account page.

TODO(owner): The account page has no list of OAuth connections and no revoke action. How does a person end an OAuth connection? Do we add this feature, or change the text of the consent screen?

## Related pages

- [MCP server](overview.md)
- [Connect Claude](connect-claude.md)
- [Connect Cursor and other clients](connect-cursor-and-others.md)
- [Security](../self-hosting/security.md)
