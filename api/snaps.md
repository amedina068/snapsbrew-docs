---
title: Snaps
description: Render a template or a collection into an image or a PDF, in sync or async mode, with variants and idempotency keys.
order: 8
---

# Snaps

A snap is a rendered image or PDF. The instance renders a template with your content in its layers. See [Snaps](../using-snapsbrew/snaps.md) for the web screens.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/snaps` | Renders one snap from a template, or one snap for each template of a collection. |

To render up to 100 snaps from one template, use [Snap batches](snap-batches.md). To see a result before you render it, use [Preview](preview.md).

## Create a snap

```http
POST /v1/snaps
```

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** yes

Send `template_id` or `collection_id`. Do not send both.

The API renders the **published** version of each template. A draft edit has no effect until you publish the template. A template that has no published version renders its draft. See [Publish a template](templates.md#publish-a-template).

### Sync and async mode

- **Sync (the default).** The instance renders during the request. The response is `201` with the finished `media_url`.
- **Async (`"async": true`).** The instance puts the render on the queue. The response is `202` at once, with `status: pending`. When the render completes, the instance posts a webhook to `webhook_url`.

The queue worker must run for async mode. See [Queues and Horizon](../self-hosting/queues-and-horizon.md).

### Request body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `template_id` | string | Without `collection_id` | A template UUID of your company | The template to render. |
| `collection_id` | string | Without `template_id` | A collection UUID of your company | The collection to render. The instance renders one snap for each template. |
| `type` | string | No | `image` or `pdf` | The output type. The default is `image`. |
| `format` | string | No | `png`, `jpeg` or `webp` | The image format. The default is `png`. |
| `transparent` | boolean | No | Not with `jpeg` | Renders on a transparent background. Only `png` and `webp` accept it. |
| `async` | boolean | No | A boolean | Puts the render on the queue and returns `202`. |
| `webhook_url` | string | With `async: true` | A public `http` or `https` URL | The address that receives the webhook. |
| `variants` | array | No | See below | The content for the layers. |
| `idempotency_key` | string | No | Maximum 191 characters. Letters, digits, `_` and `-`. Not with `collection_id`. | A key for a safe retry. See [Idempotency keys](overview.md#idempotency-keys). |

### Variants

`variants` is a list of objects. Each object names a layer by its key and sets one property.

```json
[
  {"layer": "headline", "text": "Summer sale"},
  {"layer": "logo", "image_url": "https://example.com/logo.png"},
  {"layer": "backdrop", "background_color": "#ff5a36"},
  {"layer": "ticket", "qr_content": "https://example.com/rsvp"},
  {"layer": "sku", "barcode_content": "012345678905"},
  {"layer": "ribbon", "hidden": true}
]
```

| Property | Rule |
|---|---|
| `layer` | A string. Use a layer key from [`GET /v1/templates/{templateUuid}`](templates.md#get-a-template). |
| `text` | A string. |
| `image_url` | A public `http` or `https` URL. The host of `APP_URL` is also accepted. |
| `background_color` | A valid CSS color. |
| `qr_content` | A string. |
| `barcode_content` | A string of 1000 characters or fewer. |
| `hidden` | A boolean. |

For the full catalog, call [`GET /v1/guides/variant-properties`](guides.md#list-variant-properties). See also [Layers and variants](../using-snapsbrew/layers-and-variants.md).

### Response

`201` for a sync snap. The body is the snap object, with no `data` key.

```json
{
  "id": "9f1c2d3e",
  "media_url": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png",
  "width": 1200,
  "height": 630,
  "type": "image",
  "status": "completed",
  "is_async": false,
  "webhook_url": null,
  "completed_at": "2026-05-01T12:00:03Z",
  "last_error": null,
  "variants": [],
  "template_id": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
  "template_title": "Launch card",
  "created_at": "2026-05-01T12:00:00Z"
}
```

`202` for an async snap. `media_url` is `null` and `status` is `pending`.

A request with `collection_id` returns a list of snap objects, one for each template.

### The snap object

| Field | Type | Description |
|---|---|---|
| `id` | string | The UUID of the snap. |
| `media_url` | string or null | The URL of the file. It is `null` until the render completes. |
| `width` | integer or null | The width in pixels of the template version that the snap rendered. |
| `height` | integer or null | The height in pixels of the template version that the snap rendered. |
| `type` | string | `image` or `pdf`. |
| `status` | string | `pending`, `processing`, `completed`, `failed` or `canceled`. |
| `is_async` | boolean | `true` when the render ran on the queue. |
| `webhook_url` | string or null | The webhook address. |
| `completed_at` | datetime or null | The time when the render finished. |
| `last_error` | string or null | A fixed code for a failure: `render_failed`, or a webhook code (`webhook_redirect_refused`, `webhook_unreachable`, `webhook_http_<status>`). It never holds the message of the renderer. The log of the instance keeps that message. |
| `variants` | array or null | The variants that the render used. |
| `template_id` | string or null | The UUID of the template. It is `null` for a snap from an inline MCP design. |
| `template_title` | string or null | The title of the template. |
| `created_at` | datetime | The creation time. |

### Response headers

| Header | When |
|---|---|
| `X-Request-Uuid` | On each response. The ID of the usage log row. |
| `X-Idempotent-Replay: true` | When the response repeats an earlier request with the same `idempotency_key`. Nothing renders again. |

### Errors

| Status | Cause | Body |
|---|---|---|
| `401` | The token is missing or wrong. | `{"message": "Unauthenticated."}` |
| `403` | The token has no `api_requests` ability, or a permission check refused the request. | `{"message": "This action is unauthorized."}` |
| `404` | The collection has no templates. | `{"message": "The collection doesn't have any templates."}` |
| `409` | Another request with the same `idempotency_key` is in progress, or a batch owns the key. Nothing was created. | `{"message": "...", "code": "idempotency_key_in_progress"}` |
| `422` | A field failed a rule. A template or a collection that is not in your company also returns `422`, not `404`. | `{"message": "...", "errors": {...}}` |
| `429` | The `api` limit is full. Wait for the number of seconds in `Retry-After`. | `{"message": "Too Many Attempts."}` |
| `500` | An unexpected error stopped the request. | `{"message": "...", "code": "internal_error"}` |

A `409` carries a `code`:

- `idempotency_key_in_progress`: another request holds the key. Send the request again with the same key after a short wait.
- `idempotency_key_belongs_to_batch`: a batch owns the key. Send a new key.

A `422` for a template that is not in your company has its message under `errors.template_id`:

```json
{
  "message": "The selected template id is invalid.",
  "errors": {"template_id": ["The selected template id is invalid."]}
}
```

A `500` body gives no detail of the cause. The instance writes the cause to its log. Give the `X-Request-Uuid` header of the response to the person who runs the instance.

`format: jpeg` with `transparent: true` returns `422` with the message `Transparency is not supported for the JPEG format.`

### Webhook

When an async snap completes, the instance posts `{"event": "snap.completed", "snap": {...}}` to `webhook_url`. A failed snap posts no webhook. See [Webhooks](overview.md#webhooks).

## Examples

A sync render:

```bash
curl -X POST https://snapsbrew.example/api/v1/snaps \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"template_id":"<uuid>","type":"image","variants":[{"layer":"review_title","text":"Hello world"}]}'
```

An async render with a webhook and an idempotency key:

```bash
curl -X POST https://snapsbrew.example/api/v1/snaps \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"template_id":"<uuid>","async":true,"webhook_url":"https://example.com/hooks/snap","idempotency_key":"order-1042-card"}'
```

The sync render in PHP, with a safe retry:

```php
use Illuminate\Support\Facades\Http;

$response = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->timeout(90)
    ->retry(2, 1000, throw: false)
    ->post('https://snapsbrew.example/api/v1/snaps', [
        'template_id' => $templateUuid,
        'format' => 'webp',
        'variants' => [
            ['layer' => 'review_title', 'text' => 'Hello world'],
        ],
        // The same key on each attempt. A retry returns the first snap.
        'idempotency_key' => 'review-'.$review->id,
    ]);

$response->throw();

$url = $response->json('media_url');
$replayed = $response->header('X-Idempotent-Replay') === 'true';
```

A webhook receiver in Laravel:

```php
use Illuminate\Http\Request;

Route::post('/hooks/snap', function (Request $request) {
    if ($request->input('event') === 'snap.completed') {
        $snapId = $request->input('snap.id');
        $url = $request->input('snap.media_url');
        // Store the URL.
    }

    return response()->noContent();
});
```

The webhook carries no signature. Put a secret value in the path or the query of `webhook_url`, and make sure that the receiver compares it.
