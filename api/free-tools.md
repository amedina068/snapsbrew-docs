---
title: Free tools
description: The four public tool endpoints that a marketing site can call without a token, and how to turn them on.
order: 14
---

# Free tools

The free tool endpoints render one image without a token. A marketing site can call them from the browser. The app has no web pages for these tools.

An instance without a marketing site does not need these endpoints. They are off by default.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/tools/certificate-creator` | Renders a certificate from a template. |
| `POST` | `/v1/tools/twitter-graph-image-creator` | Renders a social card with an uploaded image. |
| `POST` | `/v1/tools/testimonial-image-creator` | Renders a testimonial card. |
| `POST` | `/v1/tools/screenshot-creator` | Captures a web page. |

For each endpoint:

- **Auth:** none
- **Rate limit:** `free-tools`: 5 requests each minute and 50 each day for one IP address, for all four tools together. The `api` limit (60 a minute) also applies.
- **Usage log:** no

The in-app API reference (`ApiSpec`) does not document these endpoints. The OpenAPI file and the Postman collection do not have them.

## Turn on the free tools

The endpoints return `404` until you turn them on.

1. Set `SNAPSBREW_FREE_TOOLS_ENABLED=true` in `.env`.
2. Set `SNAPSBREW_FREE_TOOLS_USER_ID` to the ID of an existing user. The screenshot tool stores its screenshots under this user. The default is `1`.
3. Set the UUID of the template of each template tool: `SNAPSBREW_FREE_TOOLS_CERTIFICATE_TEMPLATE`, `SNAPSBREW_FREE_TOOLS_TESTIMONIAL_TEMPLATE` and `SNAPSBREW_FREE_TOOLS_TWITTER_GRAPH_TEMPLATE`. A tool without a template returns `503`.
4. If you cache the configuration, run `php artisan config:cache` again.

See [Configuration](../self-hosting/configuration.md).

## Security notes

- Each template tool renders only the template that its variable names. The request cannot choose a template. The tools ignore a `template_uuid` field.
- Each template tool changes only the layers in its field table. The tools ignore other fields.
- The screenshot tool opens any public URL in the headless Chrome of the instance.
- The endpoints need no token, so anyone can call them. The `free-tools` limit applies to each IP address.

Turn the tools on only if a marketing site needs them.

## Certificate creator

```http
POST /v1/tools/certificate-creator
```

| Field | Type | Description |
|---|---|---|
| `awardee` | string | Text for the layer `awardee`. 200 characters or fewer. |
| `awarder` | string | Text for the layer `awarder`. 200 characters or fewer. |
| `date` | string | Text for the layer `date`. 100 characters or fewer. |
| `description` | string | Text for the layer `description`. 1000 characters or fewer. |

The instance renders a **PDF** and returns its URL. The instance removes the snap one day later.

TODO(owner): `CertificateCreatorController` sends each value as `{"layer": ..., "modifications": {"text": ...}}`. `LayerBuilder` reads `text` at the top level of a variant, so the certificate text does not seem to apply. Is this a bug?

## Twitter graph image creator

```http
POST /v1/tools/twitter-graph-image-creator
```

Send `multipart/form-data`.

| Field | Type | Description |
|---|---|---|
| `title` | string | Text for the layer `title`. 200 characters or fewer. |
| `website` | string | Text for the layer `website`. 200 characters or fewer. |
| `image` | file | An image for the layer `image`: JPEG, PNG, GIF, WebP or BMP, 2 MB or less. |

The instance stores the uploaded image in the media library of the first user of the instance. When `APP_ENV` is `production`, the instance removes the snap and the image one day later.

## Testimonial image creator

```http
POST /v1/tools/testimonial-image-creator
```

| Field | Type | Description |
|---|---|---|
| `author` | string | Text for the layer `author`. 200 characters or fewer. |
| `testimonial` | string | Text for the layer `testimonial`. 1000 characters or fewer. |

When `APP_ENV` is `production`, the instance removes the snap one day later.

## Screenshot creator

```http
POST /v1/tools/screenshot-creator
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | A public `http` or `https` URL. |
| `full_page` | boolean | Yes | `true` captures the full page. |
| `mobile` | boolean | Yes | `true` uses a 480x1080 viewport. `false` uses 1330x780. |

If the user in `SNAPSBREW_FREE_TOOLS_USER_ID` does not exist, the endpoint returns `503`:

```json
{
  "message": "The screenshot tool is not available. Set SNAPSBREW_FREE_TOOLS_USER_ID to an existing user."
}
```

## Response

Each tool returns `200` with the URL of the file:

```json
{
  "image_path": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png"
}
```

| Status | Cause |
|---|---|
| `404` | The free tools are off. |
| `422` | A field failed a rule. |
| `429` | The IP address sent too many requests. |
| `503` | The template of the tool is not set or does not exist, or the screenshot user does not exist. |

## Examples

```bash
curl -X POST https://snapsbrew.example/api/v1/tools/testimonial-image-creator \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"author":"Ada Lovelace","testimonial":"It renders each card in seconds."}'
```

```php
use Illuminate\Support\Facades\Http;

$imagePath = Http::acceptJson()
    ->timeout(90)
    ->post('https://snapsbrew.example/api/v1/tools/screenshot-creator', [
        'url' => 'https://example.com',
        'full_page' => false,
        'mobile' => false,
    ])
    ->throw()
    ->json('image_path');
```
