---
title: Development setup
description: Run Snapsbrew on your computer to develop and test a change.
order: 2
---

# Development setup

This page tells you how to run Snapsbrew on your computer for development. To run an instance for real use, read [Install with Docker](../getting-started/installation-docker.md).

## Requirements

- PHP 8.3 or 8.4, with the `gd`, `intl`, `exif` and `bcmath` extensions
- Composer
- Node 22 and npm
- Chrome or Chromium, for the `browsershot` renderer

SQLite is the default database for development. You do not need MySQL or Redis.

## Install the app

1. Clone the app repository and go into its folder.
2. Install the PHP packages:

   ```bash
   composer install
   ```

3. Install the Node packages:

   ```bash
   npm install
   ```

4. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

5. Generate the app key:

   ```bash
   php artisan key:generate
   ```

6. Create the SQLite database file:

   ```bash
   touch database/database.sqlite
   ```

7. Run the migrations:

   ```bash
   php artisan migrate
   ```

8. Create the Passport keys and the storage link:

   ```bash
   php artisan snapsbrew:install --prepare
   ```

9. Build the front-end assets:

   ```bash
   npm run build
   ```

10. Start the web server:

    ```bash
    php artisan serve
    ```

## Create the owner account

While the instance has no account, `/`, `/login` and `/register` redirect to `/setup`. The setup page asks for a setup token.

1. Get the setup URL with the token:

   ```bash
   php artisan snapsbrew:setup-url
   ```

2. Open the URL and create the owner account.

To create the owner in the terminal instead, run `php artisan snapsbrew:install` without `--prepare`.

## Work on the front end

To rebuild the assets each time that you save a file, start the Vite development server:

```bash
npm run dev
```

Keep `php artisan serve` open in a second terminal.

## Queues

`.env.example` sets `QUEUE_CONNECTION=sync`. With `sync`, each job runs in the request, so you do not need a queue worker.

To test the queues as production runs them, set `QUEUE_CONNECTION=redis` and start Horizon:

```bash
php artisan horizon
```

Horizon needs Redis. Read [Queues and Horizon](../self-hosting/queues-and-horizon.md).

## The renderer

The default renderer for development is `browsershot`. It starts Chrome through Node and Puppeteer for each render.

- If Puppeteer did not download a Chrome, set `PUPPETEER_EXECUTABLE_PATH` to the path of a local Chrome. Puppeteer reads this variable. The app code does not read it.
- If Node is not at `/usr/local/bin/node`, set `BROWSERSHOT_NODE_PATH`.
- If npm is not at `/usr/local/bin/npm`, set `BROWSERSHOT_NPM_PATH`.

To use Browserless instead:

1. Generate a token:

   ```bash
   export BROWSERLESS_TOKEN=$(openssl rand -hex 24)
   ```

2. Start the Browserless container:

   ```bash
   docker compose -f deploy/browserless/docker-compose.yml up -d
   ```

3. Set these values in `.env`:

   ```dotenv
   RENDER_DRIVER=browserless
   BROWSERLESS_URL=http://127.0.0.1:3000
   BROWSERLESS_TOKEN=<the same token>
   ```

Browserless loads the fonts and images of a snap from its own container. It cannot load a file from a URL that it cannot reach. Read [Rendering](../self-hosting/rendering.md).

## Test the MCP server

To open the MCP Inspector against the local server, run:

```bash
php artisan mcp:inspector mcp
```

## Before you open a pull request

1. Run the tests, the code style check and the front-end build. Read [Testing](testing.md).
2. Read the `CONTRIBUTING.md` file of the app repository.
3. If the change is large, open an issue first.

## Related pages

- [Architecture](architecture.md)
- [Testing](testing.md)
- [Add a layer type](adding-a-layer-type.md)
