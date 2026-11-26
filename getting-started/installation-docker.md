---
title: Install with Docker
description: Run Snapsbrew in one container with one volume, open the setup URL and create the owner account.
order: 2
---

# Install with Docker

Snapsbrew runs in one container. The container serves the app on port 8080 and keeps all its data in one volume at `/data`. Inside the container, s6-overlay runs the web server, the queue worker, the scheduler and a headless Chromium for the renders.

You need no `.env` file, no keys and no database server. The default database is SQLite in `/data`.

## Requirements

- Docker. The Compose plugin is necessary only for MySQL and Redis.
- A server with an `amd64` or `arm64` CPU and 2 GB of memory or more.
- For HTTPS, a domain with a DNS A record that points to the server, and free ports 80 and 443.

## Quick start

```bash
docker run -d --name snapsbrew -p 8080:8080 -v snapsbrew:/data ghcr.io/amedina068/snapsbrew
docker logs -f snapsbrew
```

The last line of the log is the setup URL. Open it and create the owner account. Then the app signs you in and shows the dashboard with six starter templates.

## Install on a server

Run the installer on the server:

```bash
curl -fsSL https://raw.githubusercontent.com/amedina068/snapsbrew/main/install.sh | bash
```

The installer asks for one value, the domain. Press Enter for `localhost`. Then it does these steps:

1. It checks the CPU, Docker, the Docker daemon and the memory.
2. It checks the ports. For a domain, ports 80 and 443 must be free. For `localhost`, it uses port 8080, or the next free port.
3. It pulls the image.
4. It starts the container with the volume `snapsbrew`.
5. It waits until `GET /up` answers.
6. It shows the app URL and the setup URL in a box.

The installer writes a log to `/tmp/snapsbrew-install.log`. You can run it again: it replaces the container and keeps the volume. This is also the upgrade procedure.

| Option | What it does |
|---|---|
| `--domain=<host>` | Uses this domain. The installer does not ask. |
| `--non-interactive` | Asks nothing. The installer reads the domain from `APP_DOMAIN`. |
| `--dry-run` | Shows each Docker command and changes nothing. |
| `--help` | Shows the options. |

These environment variables change the defaults of the installer: `SB_IMAGE`, `SB_VERSION`, `SB_CONTAINER`, `SB_VOLUME`, `SB_HTTP_PORT`, `SB_LOG_FILE` and `SB_WAIT_SECONDS`.

## Install on a server without the installer

Set `APP_DOMAIN` and publish ports 80 and 443:

```bash
docker run -d --name snapsbrew --restart unless-stopped \
  -p 80:80 -p 443:443 -p 443:443/udp \
  -e APP_DOMAIN=snapsbrew.example \
  -v snapsbrew:/data \
  ghcr.io/amedina068/snapsbrew
```

With `APP_DOMAIN`, Caddy in the container serves HTTPS on ports 80 and 443. It gets the certificate on the first request. The app derives `APP_URL`, the cookie settings and the trusted hosts from `APP_DOMAIN`.

To put the app behind your own proxy instead, read [Reverse proxy and TLS](../self-hosting/reverse-proxy-and-tls.md).

## Install with an AI agent

Give this prompt to Claude Code, Codex or another agent that has a shell on the server:

```text
Read https://raw.githubusercontent.com/amedina068/snapsbrew/main/INSTALL.md and install Snapsbrew on this server.
```

`INSTALL.md` gives the agent non-interactive steps. The agent runs the installer, then creates the owner and an API token with one command:

```bash
docker exec snapsbrew php artisan snapsbrew:install \
  --name="Ada Lovelace" --email=ada@example.com \
  --with-token=agent --json --no-interaction
```

The JSON result has a one-time `login_url` for the owner and a `connect` object with a ready `claude mcp add` line. Then the agent runs `snapsbrew:doctor --json` to check the instance. Read [Connect Claude](../mcp/connect-claude.md).

## The setup URL

The setup page at `/setup` creates the owner account. It is open only while the instance has no user. After the first user exists, `/setup` returns 404.

The setup URL holds a token. Snapsbrew makes the token from `APP_KEY` with HMAC-SHA256, so the instance stores no token. If `APP_KEY` changes, the token changes.

If you open the app without the token, the page tells you how to get the setup URL. To show the URL again, run:

```bash
docker exec snapsbrew php artisan snapsbrew:setup-url
```

The setup page has the checkbox **Add the starter templates**, which is on by default. The six templates are on the dashboard at once. Their preview images render on the queue a few seconds later.

The owner goes to the dashboard after setup. The onboarding wizard is only for the people who sign up later. Read [Accounts and registration](../self-hosting/accounts-and-registration.md).

## What the container does at start

1. On the first start, it writes `APP_KEY` and the other secrets to a file in `/data`. On a later start, it reads the same file.
2. It runs the migrations.
3. It starts the web server, the queue worker, the scheduler and Chromium.
4. The last line of the log is the setup URL, or the app URL if an owner exists.

The Docker health check reads `GET /up`.

## The /data volume

The `/data` volume holds the SQLite database, the rendered images, the uploads, the Passport keys and the generated secrets.

CAUTION: Do not lose the `/data` volume. Without `APP_KEY` and the Passport keys, the app cannot read its encrypted data, and every session, setup link and MCP OAuth token stops working.

Read [Backups](../self-hosting/backups.md).

## The published image

A version tag (`v0.1.0` and later) publishes the image `ghcr.io/amedina068/snapsbrew` for `linux/amd64` and `linux/arm64`. The `latest` tag follows the newest version. To stay on one version, use an exact tag, for example `ghcr.io/amedina068/snapsbrew:0.1.0`.

Before the first tag, build the image from a clone of the app repository:

```bash
docker build -t ghcr.io/amedina068/snapsbrew .
```

## MySQL, Redis and Browserless

SQLite in `/data` is enough for one server. For MySQL 8.4, Redis and a separate Browserless renderer, use `docker-compose.yml` of the app repository. Its `mysql` profile adds the three services, and the web container then runs Horizon instead of `queue:work`.

1. Clone the app repository:

   ```bash
   git clone https://github.com/amedina068/snapsbrew.git
   cd snapsbrew
   ```

2. Make the `.env` file. The command copies `.env.docker.example` and adds its MySQL block with two new passwords:

   ```bash
   cp .env.docker.example .env
   cat >> .env <<EOF
   COMPOSE_PROFILES=mysql
   DB_CONNECTION=mysql
   DB_HOST=mysql
   DB_PORT=3306
   DB_DATABASE=snapsbrew
   DB_USERNAME=snapsbrew
   DB_PASSWORD=$(openssl rand -hex 24)
   REDIS_HOST=redis
   REDIS_PASSWORD=null
   CACHE_DRIVER=redis
   QUEUE_CONNECTION=redis
   SESSION_DRIVER=redis
   RENDER_DRIVER=browserless
   BROWSERLESS_URL=http://browserless:3000
   RENDER_ASSET_URL=http://web:8080
   BROWSERLESS_TOKEN=$(openssl rand -hex 24)
   EOF
   ```

3. For a domain, add `APP_DOMAIN=snapsbrew.example` to `.env`. Then add `"80:80"` and `"443:443"` to the `ports` of the `web` service in `docker-compose.yml`. For localhost, skip this step.
4. Build and start the stack:

   ```bash
   docker compose up -d --build
   docker compose logs -f web
   ```

5. Wait for the line `Snapsbrew is ready`. The next line is the setup URL. Open it and create the owner account.

On the first start, the web container waits for MySQL and loads the schema. This takes about 90 seconds.

| Variable | Why it is necessary |
|---|---|
| `COMPOSE_PROFILES=mysql` | Starts the `mysql`, `redis` and `browserless` services. Then `docker compose` needs no `--profile` flag. |
| `DB_CONNECTION=mysql` and the other `DB_` values | Without them, the web container uses SQLite in `/data`, and the log shows a warning. |
| `DB_PASSWORD` | The `mysql` service creates the app user with this password. |
| `QUEUE_CONNECTION=redis` | Horizon runs the queue. With another value, the container runs `queue:work`. |
| `RENDER_DRIVER=browserless` and `BROWSERLESS_TOKEN` | The renders go to the Browserless container. The token is its only protection. |
| `RENDER_ASSET_URL=http://web:8080` | Browserless gets the images and the fonts of a snap from the web container through this address. With it, a `localhost` install renders images from its own storage. |

With Compose, add `docker compose exec web` before each `php artisan` command, for example `docker compose exec web php artisan snapsbrew:setup-url`. Read [Rendering](../self-hosting/rendering.md).

## Next steps

- [Your first snap](first-snap.md)
- [Configuration](../self-hosting/configuration.md)
- [Upgrading](upgrading.md)
