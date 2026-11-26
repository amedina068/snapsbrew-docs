---
title: Upgrading
description: Update a Snapsbrew instance to a new version, in one container, with Compose or without Docker.
order: 5
---

# Upgrading

An upgrade gets the new code, rebuilds the assets and runs the new migrations.

CAUTION: Make a backup of the database and the storage before you upgrade. A migration can change data. Read [Backups](../self-hosting/backups.md).

Read the [Release notes](release-notes.md) before you upgrade. For the changes to the code of each version, read the `CHANGELOG.md` file of the app repository.

Use the newest version tag. Each version tag publishes the Docker image, and the `latest` image tag follows the newest version.

## Upgrade the container

1. Make a backup of the `/data` volume. Read [Backups](../self-hosting/backups.md).
2. Run the installer again. It pulls the new image, replaces the container and keeps the volume:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/amedina068/snapsbrew/main/install.sh | bash
   ```

To upgrade without the installer, pull the image and start a new container with the same volume and the same options:

```bash
docker pull ghcr.io/amedina068/snapsbrew
docker rm -f snapsbrew
docker run -d --name snapsbrew --restart unless-stopped -p 8080:8080 -v snapsbrew:/data ghcr.io/amedina068/snapsbrew
```

The container runs the new migrations when it starts. To stay on one version, use an exact tag, for example `ghcr.io/amedina068/snapsbrew:0.1.0`.

## Upgrade a Compose install

1. Make a backup of the `mysql` and `data` volumes.
2. Get the new code:

   ```bash
   git pull
   ```

3. Rebuild the image and restart the stack:

   ```bash
   docker compose up -d --build
   ```

4. Wait until the `web` container is healthy:

   ```bash
   docker compose ps
   ```

The `web` container runs the new migrations when it starts. The queue worker and the scheduler run inside the `web` container.

If `docker-compose.yml` changes the Browserless image tag, Compose pulls the new image. The renderer code and the Browserless tag change together, because a new Browserless major version can change the `/screenshot` payload.

## Upgrade without Docker

1. Make a backup of the database and the `storage` folder.
2. Put the app in maintenance mode:

   ```bash
   php artisan down
   ```

3. Get the new code:

   ```bash
   git pull
   ```

4. Install the PHP packages and the Node packages:

   ```bash
   composer install --no-dev --optimize-autoloader
   npm ci
   ```

5. Build the assets:

   ```bash
   npm run build
   ```

6. Run the migrations:

   ```bash
   php artisan migrate --force
   ```

7. Cache the configuration, the routes and the views again:

   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

8. Stop Horizon so that it starts again with the new code:

   ```bash
   php artisan horizon:terminate
   ```

9. Make the app available again:

   ```bash
   php artisan up
   ```

Step 8 stops the Horizon process after the current jobs. Your process manager must start it again. Read [Queues and Horizon](../self-hosting/queues-and-horizon.md).

## After the upgrade

- Open `/up`. It must return 200.
- Open `/horizon` as the owner. Make sure that the workers run.
- Render a test snap.

If a render fails after the upgrade, read [Troubleshooting](../self-hosting/troubleshooting.md).

## Commands for old data

Some commands repair or copy data that older versions stored. Run them only when a release note tells you to:

| Command | What it does |
|---|---|
| `php artisan editor:backfill-template-documents` | Copies old layer data into the v2 editor document columns. Options: `--table=templates` or `--table=template_versions`, `--after-id`, `--limit` (1 to 5000, default 500). |
| `php artisan sb:remove-template-layers-title` | Removes the `title` field from the stored layers of each template. |

No migration fills the v2 editor documents, and an upgrade does not need them. A render reads the layers of the template, not the v2 document.

CAUTION: Do not run `php artisan editor:backfill-template-documents` unless a release note tells you to. After the command fills the v2 document of a template, the browser editor cannot save that template. The editor shows a message when you click **Save**.
