---
title: Reverse proxy and TLS
description: Serve Snapsbrew over HTTPS behind Caddy, NGINX or Traefik.
order: 2
---

# Reverse proxy and TLS

Snapsbrew does not terminate TLS itself. The `web` container answers plain HTTP on port 8080. To serve HTTPS, put a reverse proxy in front of the app.

## What the app needs from the proxy

1. Set `APP_URL` to the public HTTPS URL, for example `https://snapsbrew.example`.
2. Set `TRUSTED_PROXIES=*` in `.env`.
3. Make sure that the proxy sends the `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Port` and `X-Forwarded-Proto` headers.
4. If the proxy limits the size of a request body, allow at least 10 MB. A spreadsheet import accepts files up to 10 MB.
5. Restart the app.

Without `TRUSTED_PROXIES`, the app does not trust the forwarded headers. Then it can build `http://` links and wrong signed URLs.

The app reads these forwarded headers: `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Port`, `X-Forwarded-Proto` and the AWS ELB headers.

The value `*` trusts every client that connects to the app. Use it only when the proxy is the only client that can reach the app port. To trust only one proxy, set its IP address instead.

## Example: Caddy

Caddy gets a certificate for you and sends the forwarded headers by default:

```text
snapsbrew.example {
    reverse_proxy 127.0.0.1:8080
}
```

## Example: NGINX

```nginx
server {
    listen 443 ssl;
    server_name snapsbrew.example;

    ssl_certificate     /etc/ssl/snapsbrew.example/fullchain.pem;
    ssl_certificate_key /etc/ssl/snapsbrew.example/privkey.pem;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Things that the proxy must not change

- **Embedded forms.** The page at `/embedded-form/{formUuid}` sends `Content-Security-Policy: frame-ancestors *` so that other sites can show it in an iframe. If the proxy adds `X-Frame-Options` or its own `frame-ancestors` rule, the embedded form does not load in an iframe. Read [Embedded forms](../using-snapsbrew/embedded-forms.md).
- **Signed URLs.** A signed URL has a `signature` query parameter. The proxy must send the query string without changes.
- **The MCP server.** `/mcp` uses Streamable HTTP. Do not cut long responses on this path.

TODO(owner): Does the MCP server send streamed (SSE) responses that need `proxy_buffering off` in NGINX, or are all responses plain JSON?

## Change the host of an instance

If you move the instance to a new host, add the old host to `APP_PREVIOUS_URLS`. Embedded form URLs that the app signed on the old host then keep working.

```dotenv
APP_URL=https://snapsbrew.example
APP_PREVIOUS_URLS=https://images.old-host.example
```

The cache key of a signed URL does not depend on the host. After a move, signed URLs read the images that the instance rendered before the move.

## Browserless and the public URL

Browserless loads the images and the fonts of a template from their URLs. When the media disk is `public`, these URLs start with `APP_URL`. Browserless must reach `APP_URL` from inside its own network. Read [Rendering](rendering.md).

## Session cookies over HTTPS

To send the session cookie only over HTTPS, set `SESSION_SECURE_COOKIE=true`.
