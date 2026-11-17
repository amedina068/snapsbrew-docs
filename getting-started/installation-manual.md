---
title: Install without Docker
description: Install Snapsbrew on a server with PHP, Node, MySQL, Redis and a renderer.
order: 3
---

# Install without Docker

This page installs Snapsbrew on a Linux server without Docker. For a test on your own computer, read [Development setup](../contributing/development-setup.md) instead.

## Requirements

| Part | Version and notes |
|---|---|
| PHP | 8.3 or later (`composer.json` requires `^8.3`). The Docker image uses PHP 8.4. |
| PHP extensions | `gd`, `intl`, `exif` and `bcmath` (the Docker image adds these). Also `pdo_mysql` and `redis`, because `REDIS_CLIENT` defaults to `phpredis`. |
| Composer | 2.x. |
| Node | 22, to build the front-end assets. Browsershot also needs Node at render time. |
| Database | MySQL 8. The Docker stack uses MySQL 8.4. |
| Redis | For the cache, the sessions and the queues. The Docker stack uses Redis 8. |
| Web server | NGINX or Apache with PHP-FPM. The document root is the `public` folder. |
| Renderer | A Browserless service, or a local Chrome for Browsershot. Read [Rendering](../self-hosting/rendering.md). |

TODO(owner): Is MySQL the only supported production database, or do you also accept PostgreSQL or MariaDB reports?

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

If a reverse proxy terminates TLS in front of the app, also set `TRUSTED_PROXIES=*`. Read [Configuration](../self-hosting/configuration.md) for every variable.

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

Use a process manager, for example systemd or Supervisor, to keep Horizon running. The repository ships no unit file for this. This is an example for systemd:

```ini
[Unit]
Description=Snapsbrew Horizon
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/snapsbrew
ExecStart=/usr/bin/php artisan horizon
Restart=always

[Install]
WantedBy=multi-user.target
```

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
