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

### Errors for each endpoint

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. The body is `{"message": "Unauthenticated."}`. |
| `403` | The token has no `api_requests` ability. The body is `{"message": "Invalid ability provided."}`. |
| `429` | The `api` limit is full. Wait for the number of seconds in `Retry-After`. |

## The media record

| Field | Type | Description |
|---|---|---|
| `id` | integer | The numeric ID of the record. |
| `uuid` | string | The UUID of the record. |
| `name` | string | The name of the file, with no extension. |
| `file_name` | string | The stored file name. |
| `mime_type` | string | The type of the file, for example `image/png`. |
| `size` | integer | The size of the file in bytes. |
| `original_url` | string | The URL of the uploaded file. |
| `src` | string | The URL of the `image` conversion. Use this URL in an `image_url` variant. |
| `created_at` | datetime | The upload time. |

## List media

```http
GET /v1/media
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `page` | query | No | The page number. The first page is `1`. |

```bash
curl 'https://snapsbrew.example/api/v1/media?page=1' \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

`200` returns a flat Laravel paginator. The page fields are at the top level, next to `data`. Each item is a [media record](#the-media-record).

```json
{
  "current_page": 1,
  "data": [
    {
      "id": 12,
      "uuid": "0d4c3a1e-5b2f-4e8a-9c7d-1f2e3a4b5c6d",
      "name": "logo",
      "file_name": "7b0e4c2a-91d3-4f6e-8a5b-2c1d9e3f4a6b.png",
      "mime_type": "image/png",
      "size": 20480,
      "original_url": "https://snapsbrew.example/storage/12/7b0e4c2a-91d3-4f6e-8a5b-2c1d9e3f4a6b.png",
      "src": "https://snapsbrew.example/storage/12/conversions/7b0e4c2a-91d3-4f6e-8a5b-2c1d9e3f4a6b-image.jpg",
      "created_at": "2026-05-01T12:00:00.000000Z"
    }
  ],
  "first_page_url": "https://snapsbrew.example/api/v1/media?page=1",
  "last_page": 1,
  "next_page_url": null,
  "per_page": 12,
  "prev_page_url": null,
  "total": 1
}
```

The example leaves out `from`, `to`, `path`, `last_page_url` and `links`. These are the other standard fields of the paginator.

## Upload media

```http
POST /v1/media
```

Send the image as `multipart/form-data`.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `file` | file | Yes | `jpg`, `jpeg`, `png`, `gif`, `webp` or `bmp`. Maximum 10 MB (10240 KB). | The image to upload. |

The request example is in [Examples](#examples).

`200` returns the [media record](#the-media-record) with no `data` key:

```json
{
  "id": 12,
  "uuid": "0d4c3a1e-5b2f-4e8a-9c7d-1f2e3a4b5c6d",
  "name": "logo",
  "file_name": "7b0e4c2a-91d3-4f6e-8a5b-2c1d9e3f4a6b.png",
  "mime_type": "image/png",
  "size": 20480,
  "original_url": "https://snapsbrew.example/storage/12/7b0e4c2a-91d3-4f6e-8a5b-2c1d9e3f4a6b.png",
  "src": "https://snapsbrew.example/storage/12/conversions/7b0e4c2a-91d3-4f6e-8a5b-2c1d9e3f4a6b-image.jpg",
  "created_at": "2026-05-01T12:00:00.000000Z"
}
```

| Status | Cause |
|---|---|
| `422` | The `file` field is missing, the file is not a supported image type, or the file is larger than 10 MB. |

```json
{
  "message": "The file field must be a file of type: jpg, jpeg, png, gif, webp, bmp.",
  "errors": {"file": ["The file field must be a file of type: jpg, jpeg, png, gif, webp, bmp."]}
}
```

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
