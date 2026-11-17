---
title: Free tools
description: The four public tool endpoints that a marketing site can call without a token, and how to turn them on.
order: 13
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
- **Rate limit:** `api` (60 a minute for each IP address)
- **Usage log:** no

The in-app API reference (`ApiSpec`) does not document these endpoints. The OpenAPI file and the Postman collection do not have them.

## Turn on the free tools

The endpoints return `404` until you turn them on.

1. Set `SNAPSBREW_FREE_TOOLS_ENABLED=true` in `.env`.
2. Set `SNAPSBREW_FREE_TOOLS_USER_ID` to the ID of an existing user. The screenshot tool stores its screenshots under this user. The default is `1`.
3. If you cache the configuration, run `php artisan config:cache` again.

See [Configuration](../self-hosting/configuration.md).

## Security notes

- The three template tools accept the UUID of any template on the instance. They do not check the company. Anyone who knows a template UUID can render it.
- The screenshot tool opens any public URL in the headless Chrome of the instance.
- The endpoints need no token, so anyone can call them.

Turn the tools on only if a marketing site needs them.

TODO(owner): Do you want the template tools to accept only an allow-list of template UUIDs?

## Certificate creator

```http
POST /v1/tools/certificate-creator
```

| Field | Type | Description |
|---|---|---|
| `template_uuid` | string | The UUID of an existing template. |
| `awardee` | string | Text for the layer `awardee`. |
| `awarder` | string | Text for the layer `awarder`. |
| `date` | string | Text for the layer `date`. |
| `description` | string | Text for the layer `description`. |

The instance renders a **PDF** and returns its URL. The instance removes the snap one day later.

TODO(owner): `CertificateCreatorController` sends each value as `{"layer": ..., "modifications": {"text": ...}}`. `LayerBuilder` reads `text` at the top level of a variant, so the certificate text does not seem to apply. Is this a bug?

## Twitter graph image creator

```http
POST /v1/tools/twitter-graph-image-creator
```

Send `multipart/form-data`.

| Field | Type | Description |
|---|---|---|
| `template_uuid` | string | The UUID of an existing template. |
| `title` | string | Text for the layer `title`. |
| `website` | string | Text for the layer `website`. |
| `image` | file | An image for the layer `image`. |

The instance stores the uploaded image in the media library of the first user of the instance. When `APP_ENV` is `production`, the instance removes the snap and the image one day later.

## Testimonial image creator

```http
POST /v1/tools/testimonial-image-creator
```

| Field | Type | Description |
|---|---|---|
| `template_uuid` | string | The UUID of an existing template. |
| `author` | string | Text for the layer `author`. |
| `testimonial` | string | Text for the layer `testimonial`. |

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
| `404` | The free tools are off, or the template does not exist. |
| `422` | A field failed a rule. |
| `503` | The screenshot user does not exist. |

## Examples

```bash
curl -X POST https://snapsbrew.example/api/v1/tools/testimonial-image-creator \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"template_uuid":"<uuid>","author":"Ada Lovelace","testimonial":"It renders each card in seconds."}'
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
