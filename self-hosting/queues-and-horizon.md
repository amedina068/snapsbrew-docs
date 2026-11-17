---
title: Queues and Horizon
description: How Snapsbrew uses queues, how Horizon runs them, and who can open the Horizon dashboard.
order: 5
---

# Queues and Horizon

Snapsbrew sends slow work to a queue. Laravel Horizon runs the queue workers on Redis.

## What runs on the queue

| Queue | Priority | Work |
|---|---|---|
| `renders` | 1 (highest) | Async snaps from the REST API, the MCP server, the "generate" page and onboarding. A person waits for these. |
| `imports` | 2 | Spreadsheet imports, API batches and the items of creative packages. |
| `mail` | 3 | Queued emails, for example invitations and "import finished" emails. |
| `default` | 4 | Cleanup and other work. |

`App\Support\Queues` holds these names. The Horizon supervisor reads the same list, so a job never goes to a queue that no worker reads.

## Choose the queue connection

| `QUEUE_CONNECTION` | Effect |
|---|---|
| `sync` | Each job runs in the web request. No worker is necessary. Use it only for local development. |
| `redis` | Jobs go to Redis. Horizon must run. Docker sets this value. |

If `QUEUE_CONNECTION` is `redis` and Horizon does not run, async snaps, batches and imports stay `pending`.

## Run Horizon

With Docker, the `horizon` container runs `php artisan horizon`. It starts after the `web` container is healthy. It gets 60 seconds to stop.

Without Docker, run `php artisan horizon` under a process manager, for example systemd or Supervisor. Read [Install without Docker](../getting-started/installation-manual.md) for an example unit.

After you deploy new code, stop Horizon so that the process manager starts it with the new code:

```bash
php artisan horizon:terminate
```

## The supervisor

`config/horizon.php` defines one supervisor, `supervisor-1`:

| Setting | Value |
|---|---|
| Connection | `redis` |
| Queues | `renders`, `imports`, `mail`, `default` |
| Balance | `auto`, with the `time` strategy |
| Maximum processes | 10 when `APP_ENV` is `production`, 3 when `APP_ENV` is `local` |
| Memory | 128 MB for each worker |
| Tries | 1 |
| Timeout | 60 seconds |

CAUTION: Set `APP_ENV` to `production` or `local`. Horizon starts workers only for the environments in `config/horizon.php`. With another value, for example `staging`, Horizon runs but starts no worker.

Keep the maximum process count in line with the `CONCURRENT` value of Browserless. Read [Rendering](rendering.md).

The items of a creative package are an exception to the supervisor values. Each item job sets its own tries (3) and timeout (120 seconds). Read [Creative packages](../using-snapsbrew/creative-packages.md).

TODO(owner): Do you want a supported way to change the Horizon process count without an edit of `config/horizon.php`, for example an environment variable?

## The Horizon dashboard

The dashboard is at `/horizon`. `HORIZON_PATH` changes the path, and `HORIZON_DOMAIN` moves it to another domain.

When `APP_ENV` is not `local`, only the owner of the instance can open the dashboard. When `APP_ENV` is `local`, Horizon lets every visitor open it.

CAUTION: Set `APP_ENV=production` on a server. With `APP_ENV=local`, every visitor can open `/horizon`.

## Failed jobs

Failed jobs go to the `failed_jobs` table (`QUEUE_FAILED_DRIVER=database-uuids`). You can read them in the Horizon dashboard.

To try a failed job again:

```bash
php artisan queue:retry <job uuid>
```

A failed render job sets the snap to `failed` and stores the reason in `last_error`.

## Redis keys

Horizon keeps its data in Redis under `HORIZON_PREFIX`. The default is `<app name>_horizon:`. If two instances share one Redis server, give each instance its own `HORIZON_PREFIX`, `REDIS_PREFIX` and `CACHE_PREFIX`.
