---
title: Reverse proxy and TLS
description: Serve Snapsbrew over HTTPS behind Caddy, NGINX or Traefik.
order: 2
---

# Reverse proxy and TLS

Snapsbrew does not terminate TLS itself. The `web` container answers plain HTTP on port 8080. Docker publishes this port on `127.0.0.1` of the host only. To serve HTTPS, put a reverse proxy on the host in front of the app.

## What the app needs from the proxy

1. Set `APP_URL` to the public HTTPS URL, for example `https://snapsbrew.example`.
2. Set `TRUSTED_PROXIES` in `.env` to the address of each proxy that sends requests to the app. Read [Trusted proxies](#trusted-proxies).
3. Make sure that the proxy sends the original `Host` header. Read [The hosts that the app answers](#the-hosts-that-the-app-answers).
4. Make sure that the proxy sends the `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Port` and `X-Forwarded-Proto` headers.
5. If the proxy limits the size of a request body, allow at least 10 MB. A spreadsheet import accepts files up to 10 MB.
6. Restart the app.

Without `TRUSTED_PROXIES`, the app does not trust the forwarded headers. Then it can build `http://` links and wrong signed URLs.

The app reads these forwarded headers: `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Port`, `X-Forwarded-Proto` and the AWS ELB headers.

## Trusted proxies

`TRUSTED_PROXIES` is a comma-separated list of IP addresses and CIDR ranges. The app reads the `X-Forwarded-*` headers only from a request that comes from one of them. Then it takes the client IP from `X-Forwarded-For`.

The limits for each IP use this client IP. Examples are the login limit, the embedded form limits, the signed URL limit and the free tools limit.

WARNING: Do not set `TRUSTED_PROXIES=*`. With `*`, the app trusts the `X-Forwarded-For` header of every client. A client can then choose its own IP and pass every limit for one IP.

Give the address of each proxy in front of the app:

- **A proxy on the same host as Docker.** A request from the host reaches the app from the gateway address of the Docker network. Find it with `docker network inspect <project>_default --format '{{(index .IPAM.Config 0).Gateway}}'`. Do not trust the whole Docker range, because Browserless and the other containers are in it.
- **A proxy on another server.** Use the private address of that server.
- **Cloudflare.** Also add the Cloudflare ranges. Copy the current list from [cloudflare.com/ips](https://www.cloudflare.com/ips/). Make sure that your proxy adds the address of Cloudflare to `X-Forwarded-For`.

This example trusts a proxy on the Docker gateway `172.18.0.1` and the Cloudflare ranges:

```dotenv
TRUSTED_PROXIES=172.18.0.1,173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22,2400:cb00::/32,2606:4700::/32,2803:f800::/32,2405:b500::/32,2405:8100::/32,2a06:98c0::/29,2c0f:f248::/32
```

The app also limits the login attempts for one email from all IPs together. A wrong proxy setting then cannot open the login to an unlimited number of attempts. The other limits for one IP have no such second limit.

## The hosts that the app answers

The app answers `400` to a request for a host that is not one of these:

- the host of `APP_URL`
- a host in `APP_PREVIOUS_URLS`
- `localhost`, `127.0.0.1` or `[::1]`, for the health check of the container

The app builds every link from `APP_URL`, never from the host of the request.

The proxy must send the host that the visitor asked for. Caddy and Traefik send the original `Host` header by default. With NGINX, set `proxy_set_header Host $host;`.

The app reads `X-Forwarded-Host` only from a trusted proxy. When it reads that header, the value must also be one of the hosts above.

If every page returns `400` behind a proxy, read [Troubleshooting](troubleshooting.md#every-page-returns-400-behind-a-proxy).

## Expose the app port

The Compose files publish the app port on `127.0.0.1`. Only a client on the host, for example the proxy, can reach it. To take traffic from other hosts with no proxy, set `APP_BIND=0.0.0.0` in `.env`. Then any client that can reach the port can skip the proxy.

## Example: Caddy

The app repository has this example as [`deploy/caddy/Caddyfile`](https://github.com/amedina068/snapsbrew/blob/main/deploy/caddy/Caddyfile).

Caddy gets a certificate for you and sends the forwarded headers by default:

```text
snapsbrew.example {
    reverse_proxy 127.0.0.1:8080
}
```

## Example: NGINX

The app repository has a full example with the HTTP to HTTPS redirect as [`deploy/nginx/snapsbrew-docker.conf`](https://github.com/amedina068/snapsbrew/blob/main/deploy/nginx/snapsbrew-docker.conf).

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

Most responses of the MCP server are plain JSON. The tools `preview-template`, `preview-snap` and `preview-design` answer with `Content-Type: text/event-stream`. Each of these streams holds one message, and the server sends it when the tool ends. Thus NGINX buffering does not break a client, and `proxy_buffering off` is not necessary.

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

When `APP_URL` starts with `https://`, the app sends the session cookie only over HTTPS. `SESSION_SECURE_COOKIE` changes this. Set it to `false` only when the browser reaches an `https` `APP_URL` over plain HTTP.
