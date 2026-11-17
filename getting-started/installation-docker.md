---
title: Install with Docker
description: Run Snapsbrew with Docker Compose, create the owner account and open the app.
order: 2
---

# Install with Docker

The repository has a `Dockerfile` and a `docker-compose.yml`. The Compose stack has six containers:

| Container | Image | What it does |
|---|---|---|
| `web` | `snapsbrew:latest` (built from the `Dockerfile`) | PHP-FPM and NGINX. Serves the app on port 8080. |
| `horizon` | `snapsbrew:latest` | Runs `php artisan horizon`, the queue worker. |
| `scheduler` | `snapsbrew:latest` | Runs `php artisan schedule:work`. |
| `mysql` | `mysql:8.4` | The database. |
| `redis` | `redis:8-alpine` | The cache, the sessions and the queues. |
| `browserless` | `ghcr.io/browserless/chromium:v2.38.1` | The renderer. |

The app image is based on `serversideup/php:8.4-fpm-nginx-trixie-v5.1.2`.

## Requirements

- Docker with the Compose plugin.
- `openssl`, to make the secrets.
- A host name that people can open, if the instance is public.

## Install

1. Clone the repository and go into its folder.
2. Copy the Docker settings file:

   ```bash
   cp .env.docker.example .env
   ```

3. Make the app key and the secrets:

   ```bash
   echo "APP_KEY=base64:$(openssl rand -base64 32)"
   echo "DB_PASSWORD=$(openssl rand -hex 16)"
   echo "DB_ROOT_PASSWORD=$(openssl rand -hex 16)"
   echo "BROWSERLESS_TOKEN=$(openssl rand -hex 24)"
   ```

4. Put the four values in `.env`.
5. Set `APP_URL` to the URL that people open, for example `https://snapsbrew.example`.
6. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

7. Wait until the `web` container is healthy:

   ```bash
   docker compose ps
   ```

8. Read the setup URL in the log of the `web` container:

   ```bash
   docker compose logs web
   ```

9. Open the setup URL and create the owner account. Then the app signs you in.

The first start runs all the migrations. It can take some minutes. The health check of `web` waits up to 10 minutes before a failure counts.

If `DB_PASSWORD`, `DB_ROOT_PASSWORD` or `BROWSERLESS_TOKEN` is empty, `docker compose` stops with an error that names the missing variable.

## The setup URL

The setup page at `/setup` creates the owner account. It is open only while the instance has no user. After the first user exists, `/setup` returns 404.

The setup URL holds a token. Snapsbrew makes the token from `APP_KEY` with HMAC-SHA256, so the instance stores no token. If `APP_KEY` changes, the token changes.

If you lose the setup URL, show it again:

```bash
docker compose exec web php artisan snapsbrew:setup-url
```

To create the owner in the terminal instead of the setup page, run this command. It asks for the name, the email and the password:

```bash
docker compose exec web php artisan snapsbrew:install
```

You can also give the values as options: `--name`, `--email`, `--password` and `--company`. Read [Accounts and registration](../self-hosting/accounts-and-registration.md) for the owner and the registration modes.

## What the `web` container does at start

1. The serversideup entrypoint runs the Laravel automations (`AUTORUN_ENABLED`). These run the migrations, the storage link and the Laravel caches.
2. The script `deploy/docker/entrypoint.d/60-snapsbrew-setup.sh` runs `php artisan snapsbrew:install --prepare`. This command creates the Passport keys and the storage link when they are missing.
3. While no account exists, the script prints the setup URL to the log.

Only the `web` container sets `SNAPSBREW_PREPARE_ON_START=true`, so only `web` does steps 2 and 3. The `horizon` and `scheduler` containers start after `web` is healthy.

## Volumes

| Volume | Content |
|---|---|
| `storage` | The rendered images, the uploads, the Passport keys and the logs. It is mounted at `/var/www/html/storage`. |
| `mysql` | The database files. |
| `redis` | The Redis data. |

Make a backup of these volumes. Read [Backups](../self-hosting/backups.md).

## Ports and HTTPS

The app answers on port 8080 of the host. To change the port, set `APP_PORT` in `.env`.

The stack does not serve HTTPS. To serve HTTPS, put a reverse proxy in front of the app and set `TRUSTED_PROXIES=*`. Read [Reverse proxy and TLS](../self-hosting/reverse-proxy-and-tls.md).

The Browserless port is not published. The token is the only protection of Browserless, so its port stays inside the Compose network.

## Settings that Compose sets

`docker-compose.yml` sets these values for the app containers. Do not set them in `.env`, because the Compose values win:

| Variable | Value |
|---|---|
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `mysql` |
| `DB_PORT` | `3306` |
| `REDIS_HOST` | `redis` |
| `CACHE_DRIVER` | `redis` |
| `QUEUE_CONNECTION` | `redis` |
| `SESSION_DRIVER` | `redis` |
| `RENDER_DRIVER` | `browserless` |
| `BROWSERLESS_URL` | `http://browserless:3000` |

The Browserless container has these limits: `CONCURRENT` is 5, `QUEUED` is 20 and `TIMEOUT` is 60000 milliseconds.

## Known limit: images on the instance

Browserless renders inside its own container. If a template loads an image from your instance, Browserless gets that image through `APP_URL`.

- A public domain works.
- A `localhost` URL does not work for these images, because `localhost` inside the Browserless container is the container itself.

Read [Rendering](../self-hosting/rendering.md) for more information.

## Next steps

- [Your first snap](first-snap.md)
- [Configuration](../self-hosting/configuration.md)
- [Upgrading](upgrading.md)
