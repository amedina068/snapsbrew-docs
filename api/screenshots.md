---
title: Screenshots
description: Capture a web page as an image and read the screenshots of your company.
order: 7
---

# Screenshots

A screenshot is an image of a web page. The instance opens the page in its headless Chrome and stores the image. See [Screenshots](../using-snapsbrew/screenshots.md) for the web screens.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/screenshots` | Lists the screenshots of your company, with cursor pagination. |
| `GET` | `/v1/screenshots/{screenshotUuid}` | Returns one screenshot. |
| `POST` | `/v1/screenshots` | Captures a web page. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** yes

## List screenshots

```http
GET /v1/screenshots
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `cursor` | query | No | The value of `meta.next_cursor` from the previous page. |

```json
{
  "data": [
    {
      "uuid": "a1b2c3",
      "url": "https://example.com",
      "image_url": "https://snapsbrew.example/storage/screenshots/a1b2c3.png",
      "width": 1330,
      "height": 780,
      "created_at": "2026-05-01T12:00:00Z"
    }
  ],
  "meta": {"previous_cursor": null, "next_cursor": null}
}
```

The list names the ID `uuid`. The single read and the create name the same value `id`.

## Get a screenshot

```http
GET /v1/screenshots/{screenshotUuid}
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `screenshotUuid` | path | Yes | The UUID of the screenshot. |

```json
{
  "data": {
    "id": "a1b2c3",
    "url": "https://example.com",
    "image_url": "https://snapsbrew.example/storage/screenshots/a1b2c3.png",
    "width": 1330,
    "height": 780,
    "created_at": "2026-05-01T12:00:00Z"
  }
}
```

`404` means that the screenshot is not in your company.

## Create a screenshot

```http
POST /v1/screenshots
```

Captures the page during the request. The response comes back when the image is stored.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `url` | string | No | A public `http` or `https` URL | The page to capture. |
| `width` | integer | No | An integer | The viewport width. The default is 1330. |
| `height` | integer | No | An integer | The viewport height. The default is 780. |

TODO(owner): `url` is not required in `ScreenshotController::store()`. What does the instance do with a request that has no `url`?

The host of `url` must resolve to public addresses only. The host of `APP_URL` is also accepted. A private, loopback, link-local or reserved address returns `422`.

`200` returns the screenshot in the same shape as the single read.

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. |
| `422` | `url` is not a public URL, or `width` or `height` is not an integer. |

## Examples

```bash
curl -X POST https://snapsbrew.example/api/v1/screenshots \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","width":1330,"height":780}'
```

```php
use Illuminate\Support\Facades\Http;

$screenshot = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->timeout(120)
    ->post('https://snapsbrew.example/api/v1/screenshots', [
        'url' => 'https://example.com',
        'width' => 1330,
        'height' => 780,
    ])
    ->throw()
    ->json('data');

$imageUrl = $screenshot['image_url'];
```

The capture runs during the request. Give the HTTP client a long timeout.
