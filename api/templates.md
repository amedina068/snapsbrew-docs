---
title: Templates
description: List, read, create, update, publish and delete templates through the REST API.
order: 4
---

# Templates

A template is a reusable design with layers. Each template endpoint works only on the templates of your company.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/templates` | Lists the templates, with cursor pagination. |
| `GET` | `/v1/templates/sizes` | Lists the canvas size presets. |
| `GET` | `/v1/templates/{templateUuid}` | Returns one template and its publish state. |
| `POST` | `/v1/templates` | Creates a template. |
| `PATCH` | `/v1/templates/{templateIdentifier}` | Updates a template. |
| `POST` | `/v1/templates/{templateUuid}/publish` | Publishes the draft as a new version. |
| `DELETE` | `/v1/templates/{templateIdentifier}` | Deletes a template. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)

The three `GET` routes go into the usage log. The writes do not.

### Errors for each endpoint

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. The body is `{"message": "Unauthenticated."}`. |
| `403` | The token has no `api_requests` ability. The body is `{"message": "Invalid ability provided."}`. |
| `429` | The `api` limit is full. Wait for the number of seconds in `Retry-After`. |

Each section below lists the other statuses of its endpoint.

## Draft and published version

A template has a draft and zero or more published versions. A write changes the draft. Snaps and previews render the newest published version. An edit has no effect on a render until you publish the template. See [Templates](../using-snapsbrew/templates.md).

## List templates

```http
GET /v1/templates
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `cursor` | query | No | The value of `meta.next_cursor` from the previous page. |

```bash
curl https://snapsbrew.example/api/v1/templates \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

`200` returns a page of templates. Each layer shows its key in `layer` and the overrides that it accepts in `available_modifications`. Each override shows its current value. A layer that accepts no override has an empty list.

```json
{
  "data": [
    {
      "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
      "title": "Template 1",
      "width": 1200,
      "height": 630,
      "layers": [
        {
          "layer": "review_title",
          "available_modifications": {"text": "The worst Time-Travel movie ever made"}
        }
      ],
      "created_at": "2026-05-01T12:00:00Z"
    }
  ],
  "meta": {"previous_cursor": null, "next_cursor": "eyJpZCI6MTB9"}
}
```

| Status | Cause |
|---|---|
| `422` | `cursor` is not a string. The message is under `errors.cursor`. |

## List canvas size presets

```http
GET /v1/templates/sizes
```

Returns each size preset that a template write accepts as `size`. Each preset has its dimensions, its aspect ratio and a safe margin.

```bash
curl https://snapsbrew.example/api/v1/templates/sizes \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

```json
{
  "data": [
    {
      "size": "instagram_story",
      "name": "Instagram Story (1080x1920)",
      "platform": "Instagram",
      "width": 1080,
      "height": 1920,
      "aspect_ratio": "9:16",
      "safe_margin_px": 97
    }
  ]
}
```

## Get a template

```http
GET /v1/templates/{templateUuid}
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `templateUuid` | path | Yes | The UUID of the template. |

```bash
curl https://snapsbrew.example/api/v1/templates/141e8454-8aa1-420a-bd0b-18a85ba949a2 \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

`200` returns the template, its draft layers and its publish state.

```json
{
  "data": {
    "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "title": "Template 1",
    "size": "open_graph",
    "width": 1200,
    "height": 630,
    "layers": [
      {
        "layer": "review_title",
        "available_modifications": {"text": "The worst Time-Travel movie ever made"}
      }
    ],
    "published_version": 2,
    "has_unpublished_edits": true,
    "created_at": "2026-05-01T12:00:00Z"
  }
}
```

| Field | Description |
|---|---|
| `size` | The size preset of the template. It is `custom` when the dimensions match no preset. |
| `layers` | The draft layers. |
| `published_version` | The version number that snaps and previews render. It is `null` until the first publish. |
| `has_unpublished_edits` | `true` when the draft is not the same as the published version. A layer edit, a resize and an editor document edit set it. |

`404` means that the template is not in your company. The body is `{"message": "No query results for model [App\\Models\\Template]."}`.

## Create a template

```http
POST /v1/templates
```

Creates a template and makes its preview image. The account must be a `customer` or an `admin`.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `title` | string | Yes | Maximum 255 characters | The name of the template. |
| `size` | string | No | A preset value | A size preset, for example `instagram_story`. It sets `width` and `height`. |
| `width` | integer | Without `size` | 1 to 4000 | The canvas width in pixels. The server ignores it when you send `size`. |
| `height` | integer | Without `size` | 1 to 4000 | The canvas height in pixels. The server ignores it when you send `size`. |
| `layers` | array | No | Layer objects | The layer definitions. An empty or absent list makes an empty canvas. |
| `groups` | array | No | Each group needs an `id` of 64 characters or fewer | The layer groups of the editor. A group also accepts `name`, `visible`, `collapsed` and `order`. |

If the dimensions match a preset, the server stores the template under that preset. To read the layer object shape, call [`GET /v1/guides/layers`](guides.md#get-the-layer-schema).

`200` returns six fields and a message:

```json
{
  "data": {
    "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "title": "Launch card",
    "size": "open_graph",
    "width": 1200,
    "height": 630,
    "created_at": "2026-05-01T12:00:00Z"
  },
  "message": "Template created successfully"
}
```

| Status | Cause |
|---|---|
| `403` | The account cannot create templates. The body is `{"message": "This action is unauthorized."}`. |
| `422` | The body has no `size` and no `width` and `height`, or a field failed a rule. |

The request example is in [Examples](#examples).

```json
{
  "message": "Send a `size` preset or an explicit `width` and `height`.",
  "errors": {
    "width": ["Send a `size` preset or an explicit `width` and `height`."],
    "height": ["Send a `size` preset or an explicit `width` and `height`."]
  }
}
```

## Update a template

```http
PATCH /v1/templates/{templateIdentifier}
```

Updates the draft of a template and makes a new preview image.

| Parameter | In | Required | Description |
|---|---|---|---|
| `templateIdentifier` | path | Yes | The template UUID or the numeric template ID. A value of digits only reads the numeric ID. |

The body takes the same fields as the create. `title` is required. The other fields are optional:

- A field that you do not send keeps its value.
- `size` sets `width` and `height`. `width` and `height` set `size`.
- `layers: null`, `width: null` and `height: null` keep the stored value.
- `groups: null` removes the groups.

```bash
curl -X PATCH https://snapsbrew.example/api/v1/templates/141e8454-8aa1-420a-bd0b-18a85ba949a2 \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Updated title"}'
```

`200` returns the same six fields as the create and the message `Template updated successfully`. Read `data.size`, `data.width` and `data.height` after the write.

```json
{
  "data": {
    "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "title": "Updated title",
    "size": "open_graph",
    "width": 1200,
    "height": 630,
    "created_at": "2026-05-01T12:00:00Z"
  },
  "message": "Template updated successfully"
}
```

| Status | Cause |
|---|---|
| `403` | The account cannot update templates of the company. The body is `{"message": "This action is unauthorized."}`. |
| `404` | The template is not in your company. |
| `409` | The template uses the v2 editor document. The body is `{"code": "legacy_edit_rejected_for_v2"}`. Use [Editor documents](editor-documents.md) for this template. |
| `422` | A field failed a rule. |

## Publish a template

```http
POST /v1/templates/{templateUuid}/publish
```

Freezes the current draft as a new version and returns the version number. New snaps and previews then render this version. Each account in the company that can update the template can publish it.

You can send this call again with no risk. If the draft has no new edits, the call returns the live version and makes no second version.

`200` returns the version:

```json
{
  "data": {
    "id": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "published_version": 2
  },
  "message": "Template published. New snaps and previews now render this version."
}
```

`data.id` is deprecated. It has the same value as `data.uuid`. Read `data.uuid`.

| Status | Cause |
|---|---|
| `403` | The account cannot update templates of the company. The body is `{"message": "This action is unauthorized."}`. |
| `404` | The template is not in your company. |

The request example is in [Examples](#examples).

## Delete a template

```http
DELETE /v1/templates/{templateIdentifier}
```

Deletes a template. The path accepts the UUID or the numeric ID.

```bash
curl -X DELETE https://snapsbrew.example/api/v1/templates/141e8454-8aa1-420a-bd0b-18a85ba949a2 \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

`200` returns a message only:

```json
{"message": "Template deleted successfully"}
```

| Status | Cause |
|---|---|
| `403` | The account cannot delete templates of the company. The body is `{"message": "This action is unauthorized."}`. |
| `404` | The template is not in your company. |

## Examples

Create a template from a preset:

```bash
curl -X POST https://snapsbrew.example/api/v1/templates \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Launch card","size":"open_graph","layers":[{"key":"headline","properties":[{"name":"textContent","value":"Hello"},{"name":"positionX","value":80},{"name":"positionY","value":120}]}]}'
```

Publish it:

```bash
curl -X POST https://snapsbrew.example/api/v1/templates/<uuid>/publish \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

The same steps in PHP:

```php
use Illuminate\Support\Facades\Http;

$api = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->baseUrl('https://snapsbrew.example/api');

$template = $api->post('/v1/templates', [
    'title' => 'Launch card',
    'size' => 'open_graph',
    'layers' => [
        ['key' => 'headline', 'properties' => [
            ['name' => 'textContent', 'value' => 'Hello'],
            ['name' => 'positionX', 'value' => 80],
            ['name' => 'positionY', 'value' => 120],
        ]],
    ],
])->throw()->json('data');

$version = $api->post("/v1/templates/{$template['uuid']}/publish")
    ->throw()
    ->json('data.published_version');
```

Read all templates, page by page:

```php
$cursor = null;

do {
    $page = $api->get('/v1/templates', array_filter(['cursor' => $cursor]))->throw();

    foreach ($page->json('data') as $template) {
        // Use $template['uuid'] and $template['layers'].
    }

    $cursor = $page->json('meta.next_cursor');
} while ($cursor !== null);
```
