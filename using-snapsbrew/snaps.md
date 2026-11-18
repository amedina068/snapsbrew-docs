---
title: Snaps
description: Render a snap from a template, in sync or async mode, as an image or a PDF.
order: 4
---

# Snaps

A snap is one render of a template. It is an image (PNG, JPEG or WebP) or a PDF. A snap stores the variants that it used, its status and the URL of the file.

## Ways to create a snap

| Surface | Mode | Page |
|---|---|---|
| **Generate snap** in the web app | Async | This page |
| `POST /v1/snaps` | Sync or async | [Snaps API](../api/snaps.md) |
| `POST /v1/snaps/batches` | Async, up to 100 items | [Batches and imports](batches.md) |
| Spreadsheet import | Async, one snap for each row | [Batches and imports](batches.md) |
| Signed URL | Sync, on the first request | [Signed URLs](signed-urls.md) |
| Embedded form | Sync | [Embedded forms](embedded-forms.md) |
| MCP `create-snap` and `create-snap-from-design` | Sync | [MCP tools reference](../mcp/tools-reference.md) |

Rendering is not limited. Each render writes a row in the usage log. The usage log is a history only.

## Which version renders

A snap renders the published version of its template. If the template has no published version, the snap renders the draft. Read [Templates](templates.md#draft-and-published-versions).

An async snap keeps the version that was live when the request came in. A publish after the request does not change the snap.

## Generate a snap in the web app

1. Open the template.
2. Click **Generate snap**.
3. Type the text for each text layer. Each field accepts a maximum of 280 characters.
4. Submit the form.

The page shows only the text layers of the template. The app queues the render on the `renders` queue and shows the status.

If the template is a starter template, the app first copies it into your company. The snap then belongs to the copy.

## Sync and async

A sync request renders in the HTTP request. The response has status `201` and the `media_url` of the file.

An async request returns `202` at once with status `pending`. A queue worker renders the snap. To use async mode, send `"async": true` and a `webhook_url`.

The queue must run for async snaps. Read [Queues and Horizon](../self-hosting/queues-and-horizon.md).

## Snap status

| Status | Meaning |
|---|---|
| `pending` | The snap waits in the queue. |
| `processing` | The renderer works on the snap. |
| `completed` | The file is ready. `media_url` has its URL. |
| `failed` | The render failed. `last_error` has the message from the renderer. |
| `canceled` | The batch of the snap was canceled before the snap started. |

## Output types and formats

- `type` is `image` (the default) or `pdf`.
- `format` is `png` (the default), `jpeg` or `webp`. It applies to images only.
- `transparent: true` renders the image with no page background. It works with `png` and `webp`. With `jpeg`, the request gets a `422` error.

## The webhook

When an async snap is complete, the app sends one `POST` request to `webhook_url`. The body is JSON:

```json
{
  "event": "snap.completed",
  "snap": {
    "id": "9f1c2d3e",
    "media_url": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png",
    "type": "image",
    "status": "completed",
    "is_async": true,
    "webhook_url": "https://example.com/hooks/snap",
    "completed_at": "2026-05-01T12:00:03Z",
    "last_error": null,
    "variants": [],
    "template_id": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "template_title": "Launch card",
    "created_at": "2026-05-01T12:00:00Z"
  }
}
```

- The app tries the request a maximum of three times, with a short pause between the attempts.
- If all three attempts fail, the app writes a warning to the log and puts the error in `last_error` of the snap.
- The request has no signature header.
- A failed render sends no webhook.
- `webhook_url` must be a public `http` or `https` address. A host that resolves to a private, loopback, link-local or reserved range gets a `422` error.

TODO(owner): A failed async render sends no webhook, so the receiver waits with no answer. Is this intended?

## Idempotency keys

Send an `idempotency_key` with `POST /v1/snaps` when you can retry after a timeout. The retry returns the same snap and renders nothing. The response then has the header `X-Idempotent-Replay: true`.

- A key is valid for 24 hours and belongs to your account.
- A key has a maximum of 191 characters: letters, digits, underscores and hyphens.
- A key does not work with `collection_id`.
- If a request with the same key is still in progress, the response is `409`.

The scheduler runs `php artisan snaps:prune-idempotency-keys` every hour to delete old keys. Read [Scheduler](../self-hosting/scheduler.md).

## Collections

`POST /v1/snaps` with a `collection_id` renders one snap for each template in the collection. The response is a list of snaps. Read [Collections and forms](collections-and-forms.md).

## See and delete snaps

- **Snaps** in the top menu (`/snapshots`) lists the snaps of your company.
- The page of one snap is at `/snapshots/{uuid}`.
- You can delete one snap, or select many snaps and delete them together.

## Clean up failed signed-URL snaps

An old version of the app kept a snap row with no image after a failed signed-URL render. This command finds these rows:

```bash
php artisan snaps:prune-stale-signed-url-snaps
```

- With no option, the command lists the rows and deletes nothing.
- `--force` deletes the rows.
- `--older-than=15` selects only rows older than this number of minutes. The default is 15.

## Related pages

- [Snaps API](../api/snaps.md)
- [Preview API](../api/preview.md)
- [Layers and variants](layers-and-variants.md)
