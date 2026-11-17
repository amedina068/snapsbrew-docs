---
title: Media
description: Upload images to your media library and list them, so that image layers can use them.
order: 6
---

# Media

The media library keeps the images that you upload. An image layer can use the URL of an uploaded image as its source. The library belongs to your user account, not to the company.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/media` | Lists your images, 12 for each page, newest first. |
| `POST` | `/v1/media` | Uploads one image. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** no

## List media

```http
GET /v1/media
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `page` | query | No | The page number. |

`200` returns the standard Laravel paginator. Each item is a media record with a `src` field. `src` is the URL of the `image` conversion.

```json
{
  "data": [
    {
      "id": 12,
      "file_name": "logo.png",
      "src": "https://snapsbrew.example/storage/12/conversions/logo-image.jpg"
    }
  ],
  "links": {"first": "...", "last": "...", "prev": null, "next": null},
  "meta": {"current_page": 1, "per_page": 12, "total": 1}
}
```

The example shows three fields of each item. The response also has the other columns of the media record.

TODO(owner): The media endpoints return the full Spatie media record. Which fields are a stable part of the API, other than `id`, `file_name` and `src`?

## Upload media

```http
POST /v1/media
```

Send the image as `multipart/form-data`.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `file` | file | Yes | Must be an image | The image to upload. |

`200` returns the media record with no `data` key:

```json
{
  "id": 12,
  "file_name": "logo.png",
  "src": "https://snapsbrew.example/storage/12/conversions/logo-image.jpg"
}
```

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. |
| `422` | The `file` field is missing or is not an image. |

The storage disk of the instance sets the host of `src`. See [Storage](../self-hosting/storage.md).

## Examples

```bash
curl -X POST https://snapsbrew.example/api/v1/media \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -F 'file=@logo.png'
```

```php
use Illuminate\Support\Facades\Http;

$media = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->attach('file', file_get_contents('logo.png'), 'logo.png')
    ->post('https://snapsbrew.example/api/v1/media')
    ->throw()
    ->json();

// Use the URL as the image of a layer in a snap.
$variants = [['layer' => 'logo', 'image_url' => $media['src']]];
```
