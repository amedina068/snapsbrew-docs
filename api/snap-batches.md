---
title: Snap batches
description: Render up to 100 snaps from one template in the background, read the progress and cancel a batch.
order: 9
---

# Snap batches

A batch renders up to 100 snaps from one template. Each item has its own variants. The batch always runs on the queue. See [Batches](../using-snapsbrew/batches.md) for the web screens.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/snaps/batches` | Starts a batch. |
| `GET` | `/v1/snaps/batches/{batchUuid}` | Returns the progress and each item. |
| `POST` | `/v1/snaps/batches/{batchUuid}/cancel` | Stops a batch that runs. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** yes

Each response carries an `X-Request-Uuid` header. The bodies have no `data` key.

### Errors for each endpoint

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. The body is `{"message": "Unauthenticated."}`. |
| `403` | The token has no `api_requests` ability. The body is `{"message": "Invalid ability provided."}`. |
| `429` | The `api` limit is full. Wait for the number of seconds in `Retry-After`. |

The queue worker must run. See [Queues and Horizon](../self-hosting/queues-and-horizon.md).

## Batch status

A batch has one of five statuses:

| Status | Meaning |
|---|---|
| `pending` | The batch runs. |
| `processing` | The batch runs. |
| `completed` | The batch ran to the end, and one or more items rendered. Read the `failed` count too. |
| `failed` | No item rendered. |
| `canceled` | A person or a client canceled the batch. |

`completed`, `failed` and `canceled` are terminal. A batch never leaves a terminal status. At a terminal status, `completed + failed + canceled` is equal to `total_rows`.

## Create a batch of snaps

```http
POST /v1/snaps/batches
```

The response is always `202`. The items render in the background. The API renders the **published** version of the template.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `template_id` | string | Yes | A template UUID of your company | The template of each item. |
| `items` | array | Yes | 1 to 100 items | One entry for each snap. |
| `items[].variants` | array | No | The [variant rules](snaps.md#variants) | The content for the layers of this item. |
| `items[].identifier` | string | No | Maximum 191 characters | Your name for this item. The default is `item_1`, `item_2` and on. |
| `title` | string | No | Maximum 255 characters | The name of the batch in the web app. The default is `API batch`. |
| `webhook_url` | string | No | A public `http` or `https` URL, maximum 2048 characters | The address of the one webhook at the end. |
| `type` | string | No | `image` or `pdf` | The output type of each item. The default is `image`. |
| `format` | string | No | `png`, `jpeg` or `webp` | The image format of each item. The default is `png`. |
| `transparent` | boolean | No | Not with `jpeg` | A transparent background for each item. |
| `idempotency_key` | string | No | Maximum 191 characters. Letters, digits, `_` and `-`. | A key for a safe retry. |

`type`, `format` and `transparent` apply to each item. If an item needs a different format, put it in a different batch.

More than 100 items returns `422` and creates nothing. The instance never cuts the list.

```json
{
  "uuid": "7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
  "title": "October launch",
  "status": "processing",
  "total_rows": 3,
  "processed_rows": 0,
  "completed": 0,
  "pending": 3,
  "failed": 0,
  "canceled": 0,
  "status_url": "https://snapsbrew.example/api/v1/snaps/batches/7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60"
}
```

| Status | Cause | Body |
|---|---|---|
| `202` | The batch is on the queue. A replay of the same `idempotency_key` also returns `202` with `X-Idempotent-Replay: true`. | The batch object. |
| `409` | The key is in progress on another request (`idempotency_key_in_progress`), or a single snap already used the key (`idempotency_key_belongs_to_snap`). Nothing was created. | `{"message": "This idempotency_key already belongs to a single snap. Use a new key for a batch.", "code": "idempotency_key_belongs_to_snap"}` |
| `422` | A field failed a rule. A `template_id` that is not in your company also returns `422`, with the message under `errors.template_id`. | `{"message": "A batch accepts at most 100 items. Split the request into smaller batches.", "errors": {"items": ["..."]}}` |
| `500` | An unexpected error stopped the request. The body gives no detail of the cause. | `{"message": "...", "code": "internal_error"}` |

The request example is in [Examples](#examples).

## Read a batch

```http
GET /v1/snaps/batches/{batchUuid}
```

Returns the counts and each item. Read the batch every 5 seconds or so. Stop when `status` is `completed`, `failed` or `canceled`.

```json
{
  "uuid": "7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
  "title": "October launch",
  "status": "completed",
  "total_rows": 2,
  "processed_rows": 2,
  "completed": 1,
  "pending": 0,
  "failed": 1,
  "canceled": 0,
  "status_url": "https://snapsbrew.example/api/v1/snaps/batches/7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
  "items": [
    {"id": "9f1c2d3e", "identifier": "row-1", "status": "completed", "media_url": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png", "last_error": null},
    {"id": "4b8a7c6d", "identifier": "row-2", "status": "failed", "media_url": null, "last_error": "render_failed"}
  ]
}
```

- `media_url` has a value only on an item with status `completed`. On a `pending`, `processing`, `failed` or `canceled` item it is `null`, never an empty string. The [snap object](snaps.md#the-snap-object) is different: a snap with no file has an empty string (`""`).
- `last_error` is a fixed code, the same as `last_error` of a [snap](snaps.md#the-snap-object). It never holds the message of the renderer.
- A batch of another company returns `404`, the same as a batch that does not exist.

`404` returns `{"message": "No batch with that id exists in your account."}`.

The request example is in [Examples](#examples).

## Cancel a batch

```http
POST /v1/snaps/batches/{batchUuid}/cancel
```

Stops a batch that runs:

- An item that rendered keeps its image.
- An item that did not start gets the status `canceled` and never renders.
- An item that renders at that moment can still complete.

You cannot undo a cancel or continue a canceled batch. Start a new batch for the items that you still want.

`200` returns the batch with its items, in the same shape as the read. A batch that is already terminal comes back with no change, so a second cancel is safe.

```json
{
  "uuid": "7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
  "title": "October launch",
  "status": "canceled",
  "total_rows": 3,
  "processed_rows": 3,
  "completed": 1,
  "pending": 0,
  "failed": 0,
  "canceled": 2,
  "status_url": "https://snapsbrew.example/api/v1/snaps/batches/7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
  "items": [
    {"id": "9f1c2d3e", "identifier": "row-1", "status": "completed", "media_url": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png", "last_error": null},
    {"id": "4b8a7c6d", "identifier": "row-2", "status": "canceled", "media_url": null, "last_error": null},
    {"id": "2e5f9a1b", "identifier": "row-3", "status": "canceled", "media_url": null, "last_error": null}
  ]
}
```

`404` returns the same body as the read.

The request example is in [Examples](#examples).

## Webhook

If you send `webhook_url`, the instance posts one webhook when the batch reaches a terminal status. No item posts its own webhook.

The `event` is `snap-import.completed`, `snap-import.failed` or `snap-import.canceled`. The body has the counts in `import` and the template in `template`. See [Webhooks](overview.md#webhooks).

## Examples

```bash
curl -X POST https://snapsbrew.example/api/v1/snaps/batches \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"template_id":"<uuid>","title":"October launch","items":[{"identifier":"row-1","variants":[{"layer":"headline","text":"Hello"}]},{"identifier":"row-2","variants":[{"layer":"headline","text":"World"}]}]}'

curl https://snapsbrew.example/api/v1/snaps/batches/<batch-uuid> \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'

curl -X POST https://snapsbrew.example/api/v1/snaps/batches/<batch-uuid>/cancel \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

Start a batch and read it until it ends, in PHP:

```php
use Illuminate\Support\Facades\Http;

$api = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->baseUrl('https://snapsbrew.example/api');

$items = collect($products)->map(fn ($product) => [
    'identifier' => 'product-'.$product->id,
    'variants' => [
        ['layer' => 'headline', 'text' => $product->name],
        ['layer' => 'photo', 'image_url' => $product->image_url],
    ],
])->all();

$batch = $api->post('/v1/snaps/batches', [
    'template_id' => $templateUuid,
    'title' => 'Product cards',
    'items' => $items,
    'idempotency_key' => 'product-cards-2026-10',
])->throw()->json();

do {
    sleep(5);
    $batch = $api->get("/v1/snaps/batches/{$batch['uuid']}")->throw()->json();
} while (! in_array($batch['status'], ['completed', 'failed', 'canceled'], true));

foreach ($batch['items'] as $item) {
    if ($item['status'] === 'completed') {
        // Store $item['media_url'] for $item['identifier'].
    }
}
```
