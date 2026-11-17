---
title: Batches and imports
description: Render many snaps from one template with an API batch or a spreadsheet import.
order: 5
---

# Batches and imports

A batch renders many snaps from one template. Each item of the batch has its own variants. The app has two ways to start a batch:

- **An API batch.** `POST /v1/snaps/batches` with a maximum of 100 items.
- **A spreadsheet import.** You upload a CSV or XLSX file in the web app. Each row becomes one snap.

Both ways store the batch as a snap import. Both render the items in the background on the `imports` queue. The queue must run. Read [Queues and Horizon](../self-hosting/queues-and-horizon.md).

Each item renders the published version of the template. Read [Templates](templates.md#draft-and-published-versions).

## Batch status

A batch has one of five statuses:

| Status | Meaning |
|---|---|
| `pending` | The batch waits to start. |
| `processing` | Items are in progress. |
| `completed` | The batch ran to the end and at least one item rendered. |
| `failed` | The batch ran to the end and no item rendered. |
| `canceled` | A person stopped the batch. |

`completed`, `failed` and `canceled` are terminal. A batch does not leave a terminal status. At a terminal status, `completed + failed + canceled` equals `total_rows`.

A `completed` batch can have failed items. Read the `failed` count as well as the status.

## API batches

`POST /v1/snaps/batches` takes a `template_id` and a list of `items`. Each item has `variants` and an optional `identifier`.

- The list has 1 to 100 items. More than 100 items gets a `422` error, and the app creates nothing.
- `type`, `format` and `transparent` apply to all items.
- The default `identifier` is `item_1`, `item_2`, and more.
- The response is always `202` with the batch `uuid` and a `status_url`.

Read the batch with `GET /v1/snaps/batches/{uuid}`. Poll it about every 5 seconds. Stop when the status is terminal. Each item has `status`, `media_url` and `last_error`.

The full request and response are in [Snap batches API](../api/snap-batches.md).

## Spreadsheet imports

The template page has an **Imports** panel. It lists the latest imports of the template. **Manage** opens the list of all imports.

### Prepare the file

1. Open the template.
2. In the **Imports** panel, click **Start an import**, or click **Manage** and open a new import.
3. Click **Download Excel template**.

The app sends an XLSX file. Row 1 has one column for each layer key. Row 2 has the current value of each layer.

The file must obey these rules:

- Row 1 is the header row. Each column name is a layer key of the template.
- The file has a column for each layer key. A missing column gets an error that names it.
- A column that is not a layer key gets an error that names it.
- The file has at least one data row. The app skips an empty row.
- The file is `.xlsx`, `.xls` or `.csv`. The maximum size is 10 MB.

An empty cell keeps the template value of that layer.

### Which column changes what

The app selects the change from the properties of the layer:

| Layer has | The cell value becomes |
|---|---|
| `textContent` | `text` |
| `qrContent` | `qr_content` |
| `backgroundImage` | `image_url` |
| `backgroundColor` | `background_color` |

The app checks these properties in this order and uses the first match. A cell for a layer with none of these properties changes nothing.

TODO(owner): The import reads the layer keys from the draft, but the snaps render the published version. If the two have different keys, which one wins?

### Start the import

1. Open the **New Snaps Import** page of the template.
2. Type a title.
3. If you want webhook events, type a webhook URL.
4. Upload the file.

The app queues one snap for each row. The import page shows the progress.

### Cancel an import

Click **Cancel import** in the **Import progress** dialog. The app sends `POST /imports/{uuid}/cancel`.

The cancel has these effects:

- An item that rendered keeps its file.
- An item that did not start gets the status `canceled` and does not render.
- An item that renders at that moment can still finish.

A canceled batch does not start again. Start a new batch for the items that you still want. The API has the same action: `POST /v1/snaps/batches/{uuid}/cancel`.

## Notifications

When a batch reaches a terminal status, the app queues an email to the user who started it. The email uses the `mail` queue and the mail settings of the instance.

### Webhook events

If the batch has a `webhook_url`, the app sends a `POST` request when the batch ends. The event is one of:

- `snap-import.completed`
- `snap-import.failed`
- `snap-import.canceled`

The body is JSON:

```json
{
  "event": "snap-import.completed",
  "import": {
    "uuid": "7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
    "title": "October launch",
    "status": "completed",
    "total_rows": 2,
    "processed_rows": 2,
    "completed": 1,
    "pending": 0,
    "failed": 1,
    "canceled": 0
  },
  "template": {
    "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "title": "Launch card"
  }
}
```

A spreadsheet import also sends one `snap.completed` event for each snap. Read [Snaps](snaps.md#the-webhook) for that body. An API batch sends only the final event.

The app tries each webhook request a maximum of three times. If all attempts fail, it writes a warning to the log. The request has no signature header.

`webhook_url` must be a public `http` or `https` address with a maximum of 2048 characters.

## Idempotency keys

An API batch accepts an `idempotency_key`. A retry with the same key returns the same batch and starts no second batch. The key is valid for 24 hours. A key that `POST /v1/snaps` used gets a `409` error.

## Related pages

- [Snap batches API](../api/snap-batches.md)
- [Snaps](snaps.md)
- [Layers and variants](layers-and-variants.md)
