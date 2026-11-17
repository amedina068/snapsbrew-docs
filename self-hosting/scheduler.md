---
title: Scheduler
description: The commands that Snapsbrew runs on a timer, and how to run the Laravel scheduler.
order: 6
---

# Scheduler

Snapsbrew runs cleanup and repair commands on a timer. The Laravel scheduler starts them. `app/Console/Kernel.php` defines the list.

## Scheduled commands

| Command | When | What it does |
|---|---|---|
| `php artisan snaps:prune-idempotency-keys` | Every hour | Deletes the idempotency keys that are older than 24 hours. The API honors a key for 24 hours. |
| `php artisan creative-packages:reconcile` | Every minute, never two at the same time | Dispatches again, marks as exhausted, or counts again the items of incomplete creative packages. It restarts items that the queue lost. |
| `php artisan creative-packages:prune` | Every hour, never two at the same time | Deletes the creative packages that are older than the replay window (90 days) and releases their idempotency keys. |
| `php artisan creative-packages:prune-diagnostics` | Every hour, never two at the same time | Clears the item diagnostics that are older than the diagnostic window (30 days). |

Each pass of the creative package commands has a limit, so one pass never runs for a long time.

If the scheduler does not run, the idempotency keys and the old packages stay in the database. Creative package items that the queue lost also stay incomplete.

## Run the scheduler with Docker

The `scheduler` container runs `php artisan schedule:work`. This command runs the scheduler every minute in the foreground. The container starts after the `web` container is healthy.

## Run the scheduler without Docker

Add one cron entry for the user that runs the app:

```cron
* * * * * cd /var/www/snapsbrew && php artisan schedule:run >> /dev/null 2>&1
```

Use only one scheduler for each instance. "Never two at the same time" uses a cache lock. If you run the app on more than one server, all servers must share the same cache store, for example Redis.

TODO(owner): Do you want to add `onOneServer()` to the scheduled commands for instances with more than one app server?

## Commands that do not run on a timer

Run these commands by hand when you need them:

| Command | What it does |
|---|---|
| `php artisan snaps:prune-stale-signed-url-snaps` | Finds signed-URL snaps that have no image. Without `--force`, it only reports them. With `--force`, it deletes them. `--older-than` sets the minimum age in minutes (default 15). |
| `php artisan creative-packages:diagnostic <item>` | Shows the hidden diagnostic of one creative package item. `<item>` is the id or the uuid of the item. |

To list every scheduled command and its next run time:

```bash
php artisan schedule:list
```
