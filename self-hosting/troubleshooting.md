---
title: Troubleshooting
description: Find and correct the common problems of a self-hosted Snapsbrew instance.
order: 11
---

# Troubleshooting

## Where to look first

| Source | How to read it |
|---|---|
| The app log (Docker) | `docker compose logs web horizon scheduler`. The Docker image sets `LOG_CHANNEL=stderr`. |
| The app log (no Docker) | The daily files in `storage/logs/`. |
| Failed jobs | The Horizon dashboard at `/horizon`, as the owner. |
| One API request | The `X-Request-Uuid` header of a snap, batch or embedded form response. It is the uuid of the usage log row. Open `/logs/<uuid>` to read the row. |
| The usage log | `/logs` in the app. |

## Install and start

### `docker compose` stops with "Set DB_PASSWORD in .env"

A required variable is empty. Set `DB_PASSWORD`, `DB_ROOT_PASSWORD` and `BROWSERLESS_TOKEN` in `.env`. Read [Install with Docker](../getting-started/installation-docker.md).

### The `web` container is not healthy

The first start runs all the migrations. The health check waits up to 10 minutes. If the container is still not healthy after that time, read its log:

```bash
docker compose logs web
```

### The setup page returns 404

An account exists, so the setup page is closed. Sign in with that account. If you lost its password, read [Recover access](recover-access.md).

### "The setup token is not correct"

The token comes from `APP_KEY`. If `APP_KEY` changed after you copied the URL, the old token does not work. Show the current URL:

```bash
php artisan snapsbrew:setup-url
```

## Renders

### Snaps stay `pending`

The queue worker does not run.

1. If `QUEUE_CONNECTION` is `redis`, make sure that Horizon runs. With Docker, read `docker compose ps`.
2. Make sure that `APP_ENV` is `production` or `local`. With another value, Horizon starts no worker.
3. Open `/horizon` and look for failed jobs.

Read [Queues and Horizon](queues-and-horizon.md).

### A snap has the status `failed`

Read `last_error` of the snap. It holds the error of the renderer.

If the log has "browserless screenshot render failed after 3 attempts":

1. Make sure that Browserless runs: `docker compose ps browserless`.
2. Make sure that `BROWSERLESS_URL` and `BROWSERLESS_TOKEN` are correct.
3. From the app host, send a test request to Browserless:

   ```bash
   curl "http://127.0.0.1:3000/json/version?token=<token>"
   ```

### Images or fonts are empty in the render

The renderer cannot load the image or the font from its URL. This is the most frequent problem with Browserless.

- If `APP_URL` is a `localhost` URL, Browserless cannot reach the files of the `public` disk. Use a public domain, a bucket, or `RENDER_DRIVER=browsershot`.
- If the media URL uses a self-signed certificate, Chrome does not trust it.
- If the server blocks outgoing traffic, Chrome cannot reach `fonts.googleapis.com`.

Read [Rendering](rendering.md).

### Browsershot cannot find Chrome

Puppeteer did not download a Chrome, or Node is not at the configured path.

- Set `BROWSERSHOT_NODE_PATH` and `BROWSERSHOT_NPM_PATH` to the correct binaries.
- Set the Puppeteer variable `PUPPETEER_EXECUTABLE_PATH` to the path of a local Chrome.

### A template edit does not show in new snaps

Snaps render the published version of the template. Publish the template after the edit. Read [Templates](../using-snapsbrew/templates.md).

### The API returns 422 for a `webhook_url` or an `image_url`

The URL must be `http` or `https`, and its host must resolve to public addresses. The app refuses private, loopback and link-local hosts. The host of `APP_URL` is accepted. Read [Security](security.md).

## Signed URLs and embedded forms

### A signed URL shows a placeholder image

The app shows the placeholder image instead of an error when:

- the signature is missing or wrong,
- the signed-URL key was deleted,
- the template does not exist,
- the owner of the template is deactivated.

Make sure that you sign the sorted parameters with the correct key. Read [Signed URLs](../using-snapsbrew/signed-urls.md).

### A signed URL returns 400 "Invalid variants payload."

The `variants` value is not valid after the app decodes it. Make sure that it is the base64 of a JSON array of variants.

### An embedded form returns 404

- The signature in the URL changed. Use the exact URL that the form page gives.
- The instance moved to a new host. Add the old host to `APP_PREVIOUS_URLS`.
- The owner of the form is deactivated.

### An embedded form does not load in an iframe

A proxy adds `X-Frame-Options` or a `frame-ancestors` rule. Read [Reverse proxy and TLS](reverse-proxy-and-tls.md).

## Web app and links

### Links and signed URLs start with `http://` behind HTTPS

The app does not trust the proxy headers. Set `TRUSTED_PROXIES=*` and make sure that the proxy sends `X-Forwarded-Proto`.

### Invitation and password emails do not arrive

`MAIL_MAILER=log` writes each email to the log and sends nothing. Configure a mailer, or use the commands in [Recover access](recover-access.md).

### `/horizon` or `/admin` returns 404 or 403

Only the owner can open these pages. Sign in as the owner, or make a user the owner with `php artisan snapsbrew:install --promote=<email>`.

## API and MCP

### The API returns 429

The request went over a rate limit. Wait for the time in the `Retry-After` header. Read [API overview](../api/overview.md).

### `/mcp` returns 404

`MCP_ENABLED` is `false`. Set it to `true` and restart the app.

### The OAuth connection of an MCP client fails at the consent step

The redirect host of the client is not in `MCP_REDIRECT_DOMAINS`. Add the scheme and the host of the client, or use an API token. Read [OAuth](../mcp/oauth.md).

TODO(owner): Which error does a client see when its redirect host is not in `MCP_REDIRECT_DOMAINS`? Add the exact message here.
