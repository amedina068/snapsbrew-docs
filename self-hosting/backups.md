---
title: Backups
description: What to back up on a Snapsbrew instance, and how to back up and restore the /data volume or a Compose install.
order: 7
---

# Backups

## Back up the container

The one-container install keeps all its data in the `/data` volume: the SQLite database, the rendered images, the uploads, the Passport keys and the generated secrets with `APP_KEY`. Back up this one volume.

1. Stop the container, so that the database file does not change during the copy:

   ```bash
   docker stop snapsbrew
   ```

2. Copy the volume to a file:

   ```bash
   docker run --rm -v snapsbrew:/data -v "$PWD":/backup alpine tar czf /backup/snapsbrew-$(date +%F).tar.gz -C /data .
   ```

3. Start the container:

   ```bash
   docker start snapsbrew
   ```

To restore, stop the container, extract the file into the volume, and start the container:

```bash
docker stop snapsbrew
docker run --rm -v snapsbrew:/data -v "$PWD":/backup alpine sh -c 'cd /data && tar xzf /backup/snapsbrew-2026-11-25.tar.gz'
docker start snapsbrew
```

If `MEDIA_DISK` is a bucket, also back up the bucket.

## A Compose install or an install without Docker

These installs keep their data in four places. Back up all four.

| What | Where | Why it is important |
|---|---|---|
| The database | MySQL (the `mysql` volume in Docker) | Accounts, templates, template versions, snaps, forms, tokens and the usage log. |
| The storage folder | `storage/` (the `storage` volume in Docker) | Rendered images and uploads on the `public` disk, editor assets, uploaded spreadsheets, the Passport keys and the logs. |
| The `.env` file | The root of the app | All settings, and `APP_KEY`. |
| The bucket | S3, Spaces or R2 | Rendered images and uploads, if `MEDIA_DISK` is a bucket. |

Redis holds the cache, the sessions and the queued jobs. If you lose Redis, users must sign in again and the queued jobs are lost. A backup of Redis is not necessary for most instances.

## Keep `APP_KEY` safe

CAUTION: Keep a copy of `APP_KEY` with every backup. The app encrypts data with this key.

If `APP_KEY` changes or is lost:

- The stored signed-URL keys cannot be decrypted, so the signed URLs stop working.
- The two-factor secrets of the users cannot be decrypted.
- The setup token changes. This is important only before the first account exists.

Keep `.env` out of a public place. It holds `APP_KEY` and all other secrets.

## Keep the Passport keys

The OAuth flow of the MCP server signs tokens with the Passport keys. The keys are `storage/oauth-private.key` and `storage/oauth-public.key`, or the values of `PASSPORT_PRIVATE_KEY` and `PASSPORT_PUBLIC_KEY`. If you lose the keys, every MCP client that connected with OAuth must connect again.

## Back up a Compose install

Docker Compose adds the project name to each volume name. The project name is the name of the folder by default. The examples use the project name `snapsbrew`, so the volumes are `snapsbrew_mysql` and `snapsbrew_storage`.

1. Dump the database:

   ```bash
   docker compose exec -T mysql sh -c 'exec mysqldump --single-transaction -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > snapsbrew.sql
   ```

2. Copy the `storage` volume to an archive:

   ```bash
   docker run --rm -v snapsbrew_storage:/data -v "$PWD":/backup alpine tar czf /backup/storage.tar.gz -C /data .
   ```

3. Copy `.env` to the same safe place as the two files.

The `mysqldump` with `--single-transaction` makes a consistent copy while the app runs.

## Restore a Compose install

1. Stop the app containers:

   ```bash
   docker compose stop web horizon scheduler
   ```

2. Load the database dump:

   ```bash
   docker compose exec -T mysql sh -c 'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < snapsbrew.sql
   ```

3. Load the storage archive into the volume:

   ```bash
   docker run --rm -v snapsbrew_storage:/data -v "$PWD":/backup alpine sh -c 'cd /data && tar xzf /backup/storage.tar.gz'
   ```

4. Put the saved `.env` back in the root of the app.
5. Start the stack:

   ```bash
   docker compose up -d
   ```

## Back up an install without Docker

- Dump the database with `mysqldump --single-transaction`.
- Copy the `storage` folder.
- Copy `.env`.

## Schedule and retention

- Back up the database and the `storage` folder each day, at a time with little traffic.
- Keep the daily backups for 14 days. Also keep one backup of each week for 8 weeks.
- Keep at least one copy on another server or with another provider. A backup on the same disk as the instance does not survive a disk failure.
- Back up `.env` each time that you change it.
- If `MEDIA_DISK` is a bucket, turn on the versioning of the bucket. Keep old versions for 14 days.

These are the recommended values of the project. An instance with many renders each day can back up the database more often.

## Test the backup

Restore a backup on a test machine one time each quarter. Then make sure that you can sign in, open a template and render a snap.
