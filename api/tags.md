---
title: Tags
description: Create and search the tags of your company, and set the tags of a template.
order: 11
---

# Tags

A tag is a label for templates. Each tag belongs to your company.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/tags` | Lists up to 15 tags, with an optional search. |
| `POST` | `/v1/tags` | Creates a tag. |
| `POST` | `/v1/templates/{templateUuid}/tags` | Replaces the tags of a template. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** yes

## List tags

```http
GET /v1/tags
```

Returns up to 15 tags, in name order.

| Parameter | In | Required | Description |
|---|---|---|---|
| `search` | query | No | Returns only the tags with this text in the name. |

```json
{
  "data": [
    {"id": 1, "name": "Launch", "slug": "launch"}
  ]
}
```

## Create a tag

```http
POST /v1/tags
```

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `name` | string | Yes | Maximum 255 characters | The name of the tag. |

The instance makes the slug from the name. If the slug exists in your company, the instance adds a number, for example `launch-1`. A second tag with the same name is a new tag.

`201` returns the tag:

```json
{
  "data": {"id": 1, "name": "Launch", "slug": "launch"}
}
```

`422` means that `name` is missing or too long.

## Sync template tags

```http
POST /v1/templates/{templateUuid}/tags
```

Replaces all tags of a template with the tags that you send. To remove all tags, send an empty list.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `tag_ids` | integer array | No | An array | The tag IDs. They replace the current tags. |
| `tag_ids.*` | integer | No | A tag ID of your company | One tag ID. |

`200` returns a message and the tags of the template. This body has no `data` key.

```json
{
  "message": "Tags updated successfully.",
  "tags": [
    {"id": 1, "name": "Launch", "slug": "launch"}
  ]
}
```

| Status | Cause |
|---|---|
| `404` | The template is not in your company. |
| `422` | A tag ID does not exist in your company. |

## Examples

```bash
curl -X POST https://snapsbrew.example/api/v1/tags \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Launch"}'

curl -X POST https://snapsbrew.example/api/v1/templates/<uuid>/tags \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"tag_ids":[1,2]}'
```

Find a tag or create it, then set it on a template, in PHP:

```php
use Illuminate\Support\Facades\Http;

$api = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->baseUrl('https://snapsbrew.example/api');

$tag = collect($api->get('/v1/tags', ['search' => 'Launch'])->throw()->json('data'))
    ->firstWhere('name', 'Launch');

$tag ??= $api->post('/v1/tags', ['name' => 'Launch'])->throw()->json('data');

$api->post("/v1/templates/{$templateUuid}/tags", ['tag_ids' => [$tag['id']]])->throw();
```
