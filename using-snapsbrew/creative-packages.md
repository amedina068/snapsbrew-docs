---
title: Creative packages
description: Export up to 10 final images from published template versions into one package through the MCP server.
order: 6
---

# Creative packages

A creative package is a set of 1 to 10 final images. Each image comes from one published version of a template. The package also carries a label, alternative text and your own fields for each image.

Only the MCP server creates and reads packages. The REST API and the web app have no package endpoint. Read [MCP overview](../mcp/overview.md).

## The two tools

| Tool | What it does |
|---|---|
| `export-creative-package` | Starts a package. It returns a package id at once and renders in the background. |
| `get-creative-package` | Reads the progress, the counts, the items and the signed file URLs. It renders nothing. |

The arguments of each tool are in [MCP tools reference](../mcp/tools-reference.md).

## Export a package

Each item needs these fields:

| Field | Required | Description |
|---|---|---|
| `client_creative_id` | Yes | Your own id for the item. It is unique in the request. |
| `template_id` | Yes | The UUID of a template in your company. |
| `template_version` | Yes | A published version number of the template. |
| `label` | Yes | A display label. |
| `alt_text` | Yes | The alternative text of the image. |
| `format` | Yes | `png`, `jpeg` or `webp`. |
| `client_family_id` | No | Groups items that belong together. |
| `placement_key` | No | A placement name, for example `instagram.feed.organic`. |
| `caption` | No | A caption to carry with the image. |
| `metadata` | No | A JSON object of your own fields. |

An item renders the template version as it is. A package item takes no variants.

To get a version number, publish the template. Then read the number with the `get-template-details` tool. Read [Templates](templates.md#draft-and-published-versions).

The request also needs an `idempotency_key`. The key has a maximum of 100 characters: letters, digits, underscores and hyphens.

## Idempotency and replay

- A second export with the same key and the same items returns the same package with `replayed: true`. It starts no second package.
- The same key with different items gets the error `creative_package_idempotency_conflict`.
- A key replays its package for 90 days.

## Status and next action

Each package response has a `status` and a `next_action`. Do the action for the row:

| `status` | `next_action` | What to do |
|---|---|---|
| `building` | `poll` | Wait `poll_after_seconds`. Then call `get-creative-package` again. |
| `ready` | `download` | Read `file_url` on each manifest item and save each file. |
| `partial` | `retry_incomplete` | Save the ready files. Then use the retry rule for the failed items. |
| `failed` | `inspect_failures` | Read `failure` on each item. Then use the retry rule. |

An item has one of four statuses: `pending`, `rendering`, `ready` or `failed`.

### The retry rule

Read `failure.code` and `failure.retryable` on each failed item.

- If `retryable` is `true`, remove the cause. Then export again with the same key. The replay opens each retryable item again. It does not render a ready item again.
- If `retryable` is `false`, correct the template version. Then export again with a new key.

| Failure code | Meaning |
|---|---|
| `creative_package_entitlement_required` | The creator of the package can no longer create snaps for the company. |
| `creative_package_attempts_exhausted` | The item used all automatic render attempts. |
| `creative_package_render_failed` | The renderer did not make an image. |
| `creative_package_output_invalid` | The image did not match the source dimensions or the requested format. |

## File URLs

A `ready` or `partial` package has a manifest with signed URLs. Each read of the package signs new URLs and returns a new `url_expires_at`. A URL is valid for 10 minutes by default and 15 minutes at most.

When a URL expires, read the package again. Do not export again to get a new URL.

The URLs point to these routes:

- `GET /creative-packages/{package}/items/{item}/file`
- `GET /creative-packages/{package}/items/{item}/preview`

The signature is the credential. These routes have no other authentication. They use the `api` rate limit. A file response has the header `Cache-Control: private, no-store`.

## Limits

`App\Support\CreativePackageContract` sets these limits. `config/creative-packages.php` can set a lower value. A higher value has no effect.

| Limit | Value |
|---|---|
| Items in one package | 10 |
| Request size | 256 KB |
| `metadata` size of one item | 16 KB |
| `metadata` depth | 6 levels |
| Packages that build at the same time in one company | 3 |
| Render attempts for one item | 3 |
| Time for one attempt | 120 seconds |
| Signed URL lifetime | 600 seconds (maximum 900) |
| Replay window | 90 days |
| Diagnostic window | 30 days |

If the company already has 3 packages that build, a new export gets the error `creative_package_rate_limited`.

## Background work

The items render on the `imports` queue. The scheduler runs three commands for packages:

| Command | Schedule | What it does |
|---|---|---|
| `php artisan creative-packages:reconcile` | Every minute | Dispatches again, ends or counts again the packages that are not complete. |
| `php artisan creative-packages:prune` | Every hour | Deletes packages past the replay window and releases their keys. |
| `php artisan creative-packages:prune-diagnostics` | Every hour | Clears item diagnostics past the diagnostic window. |

If the scheduler does not run, the app does not restart an item that the queue dropped. Read [Scheduler](../self-hosting/scheduler.md).

## Diagnostics

The app keeps a private diagnostic for each failed item. The API does not show it. To read it on the server, give the id or the UUID of the item:

```bash
php artisan creative-packages:diagnostic <item>
```

## Related pages

- [MCP tools reference](../mcp/tools-reference.md)
- [Templates](templates.md)
- [Queues and Horizon](../self-hosting/queues-and-horizon.md)
