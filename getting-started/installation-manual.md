---
title: Install without Docker
description: Install Snapsbrew on a server with PHP, Node, a database, Redis and a renderer.
order: 3
---

# Install without Docker

This page installs Snapsbrew on a Linux server without Docker. The Docker image is easier to install and to keep current. It runs in one container with SQLite and needs no MySQL and no Redis. Read [Install with Docker](installation-docker.md). For a test on your own computer, read [Development setup](../contributing/development-setup.md) instead.

The manual install on this page uses MySQL, Redis, Horizon, and Browserless.

## Requirements

| Part | Version and notes |
|---|---|
| PHP | 8.3 or later (`composer.json` requires `^8.3`). The Docker image uses PHP 8.4. |
| PHP extensions | `gd`, `intl`, `exif` and `bcmath` (the Docker image adds these). Also `pdo_mysql` and `redis`, because `REDIS_CLIENT` defaults to `phpredis`. |
| Composer | 2.x. |
| Node | 22, to build the front-end assets. Browsershot also needs Node at render time. |
| Database | MySQL 8.4, or SQLite. The Docker image uses SQLite. The `mysql` profile of the Compose stack uses MySQL 8.4. |
| Redis | For the cache, the sessions and the queues with Horizon. The `mysql` profile of the Compose stack uses Redis 8. |
| Web server | NGINX or Apache with PHP-FPM. The document root is the `public` folder. |
| Renderer | A Browserless service, or a local Chrome for Browsershot. Read [Rendering](../self-hosting/rendering.md). |

The supported production databases are SQLite and MySQL 8.4. The Docker image uses SQLite. The CI tests both. The project does not support PostgreSQL or MariaDB.

The [`deploy/`](https://github.com/amedina068/snapsbrew/tree/main/deploy) folder of the app has example files for this page: NGINX, Caddy, systemd, Supervisor and PHP. Copy an example, then replace the example values with your values. Read the [deploy README](https://github.com/amedina068/snapsbrew/blob/main/deploy/README.md).

## Install the code

1. Clone the repository into the folder that the web server serves from, for example `/var/www/snapsbrew`.
2. Install the PHP packages:

   ```bash
   composer install --no-dev --optimize-autoloader
   ```

3. Install the Node packages and build the assets:

   ```bash
   npm ci
   npm run build
   ```

4. Copy the settings file:

   ```bash
   cp .env.example .env
   ```

5. Make the app key:

   ```bash
   php artisan key:generate
   ```

## Set the PHP limits

A spreadsheet import and an image upload accept 10 MB. The default PHP limit is 2 MB. If the PHP limit is lower than 10 MB, a larger file never reaches the app, and the user reads "The file field is required."

1. Copy [`deploy/php/snapsbrew.ini`](https://github.com/amedina068/snapsbrew/blob/main/deploy/php/snapsbrew.ini) to the `conf.d` folder of PHP-FPM, for example `/etc/php/8.4/fpm/conf.d/99-snapsbrew.ini`.
2. Restart PHP-FPM.

## Configure the web server

The document root is the `public` folder. Use one of these examples:

- NGINX: [`deploy/nginx/snapsbrew-php-fpm.conf`](https://github.com/amedina068/snapsbrew/blob/main/deploy/nginx/snapsbrew-php-fpm.conf)
- Caddy: [`deploy/caddy/Caddyfile.php-fpm`](https://github.com/amedina068/snapsbrew/blob/main/deploy/caddy/Caddyfile.php-fpm)

Both examples send each request for a file that does not exist to `public/index.php`. The OAuth discovery documents under `/.well-known/` go to the app this way, so do not block that path.

## Edit `.env`

`.env.example` is for local development. Change these values for a server:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://snapsbrew.example

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=snapsbrew
DB_USERNAME=snapsbrew
DB_PASSWORD=<a strong password>

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

RENDER_DRIVER=browserless
BROWSERLESS_URL=http://127.0.0.1:3000
BROWSERLESS_TOKEN=<the Browserless token>
```

If a reverse proxy terminates TLS in front of the app, also set `TRUSTED_PROXIES` to the address of the proxy. Do not set it to `*`. Read [Reverse proxy and TLS](../self-hosting/reverse-proxy-and-tls.md#trusted-proxies) and [Configuration](../self-hosting/configuration.md).

## Prepare the database and the instance

1. Create an empty MySQL database and a user for it.
2. Run the migrations:

   ```bash
   php artisan migrate --force
   ```

3. Create the Passport keys and the storage link:

   ```bash
   php artisan snapsbrew:install --prepare
   ```

4. Cache the configuration, the routes and the views:

   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

5. Make sure that the web server user can write to `storage` and `bootstrap/cache`.

The migrations also add the six starter templates. A new user can copy them from `/templates/new`.

## Start the background processes

Snapsbrew needs two long-running processes next to the web server:

- The queue worker: `php artisan horizon`. Read [Queues and Horizon](../self-hosting/queues-and-horizon.md).
- The scheduler. Read [Scheduler](../self-hosting/scheduler.md).

Use a process manager to keep both processes running. The app repository has examples:

- systemd: [`deploy/systemd/snapsbrew-horizon.service`](https://github.com/amedina068/snapsbrew/blob/main/deploy/systemd/snapsbrew-horizon.service) and [`deploy/systemd/snapsbrew-scheduler.service`](https://github.com/amedina068/snapsbrew/blob/main/deploy/systemd/snapsbrew-scheduler.service)
- Supervisor: [`deploy/supervisor/snapsbrew.conf`](https://github.com/amedina068/snapsbrew/blob/main/deploy/supervisor/snapsbrew.conf)

To install the systemd units:

1. Replace `www-data`, `/var/www/snapsbrew` and `/usr/bin/php` in the two files with your values.
2. Copy the files to `/etc/systemd/system/`.
3. Start the units:

   ```bash
   systemctl daemon-reload
   systemctl enable --now snapsbrew-horizon snapsbrew-scheduler
   ```

The scheduler unit runs `php artisan schedule:work`. It replaces the cron entry of [Scheduler](../self-hosting/scheduler.md). Use one of the two, not both.

## Start the renderer

For a server, Browserless is the recommended renderer. The repository has a Compose file for it in `deploy/browserless/`:

```bash
export BROWSERLESS_TOKEN=$(openssl rand -hex 24)
docker compose -f deploy/browserless/docker-compose.yml up -d
```

This Compose file binds the port to `127.0.0.1:3000` only. Put the same token in `BROWSERLESS_TOKEN` of the app.

If you do not use Docker at all, set `RENDER_DRIVER=browsershot` and install Chrome on the server. Read [Rendering](../self-hosting/rendering.md).

## Create the owner account

1. Show the setup URL:

   ```bash
   php artisan snapsbrew:setup-url
   ```

2. Open the URL in a browser.
3. Fill in the form to create the owner account.

To create the owner in the terminal instead, run `php artisan snapsbrew:install` without `--prepare`.

## Make sure that the instance works

- `GET /up` returns 200 when the app runs.
- Open `/horizon` as the owner. The dashboard shows the queue worker.
- Render a test snap. Read [Your first snap](first-snap.md).
